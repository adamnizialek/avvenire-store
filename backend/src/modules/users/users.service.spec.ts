import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('UsersService reset-token lifecycle', () => {
  let service: UsersService;
  let findOne: jest.Mock;
  let save: jest.Mock;

  beforeEach(() => {
    findOne = jest.fn();
    save = jest.fn((user: User) => Promise.resolve(user));
    service = new UsersService({
      findOne,
      save,
    } as unknown as Repository<User>);
  });

  describe('createResetToken', () => {
    it('returns null for an unknown email and stores nothing', async () => {
      findOne.mockResolvedValue(null);

      const token = await service.createResetToken('nobody@example.com');

      expect(token).toBeNull();
      expect(save).not.toHaveBeenCalled();
    });

    it('stores only the sha256 hash — the raw token never touches the DB', async () => {
      const user = { id: 'u1', email: 'a@b.c' } as User;
      findOne.mockResolvedValue(user);

      const token = await service.createResetToken('a@b.c');

      // Raw token is high-entropy hex for the emailed link…
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      // …but the persisted value is its hash, not the token itself.
      expect(user.resetToken).toBe(sha256(token!));
      expect(user.resetToken).not.toBe(token);
      expect(save).toHaveBeenCalledWith(user);
    });

    it('sets a roughly one-hour expiry', async () => {
      const user = { id: 'u1', email: 'a@b.c' } as User;
      findOne.mockResolvedValue(user);
      const before = Date.now();

      await service.createResetToken('a@b.c');

      const expiry = user.resetTokenExpiry!.getTime();
      expect(expiry).toBeGreaterThanOrEqual(before + 59 * 60 * 1000);
      expect(expiry).toBeLessThanOrEqual(Date.now() + 61 * 60 * 1000);
    });
  });

  describe('resetPassword', () => {
    it('returns false for an unknown or expired token and stores nothing', async () => {
      findOne.mockResolvedValue(null);

      const ok = await service.resetPassword('bad-token', 'newPassword1');

      expect(ok).toBe(false);
      expect(save).not.toHaveBeenCalled();
    });

    it('looks the user up by the token HASH (matching what createResetToken stored)', async () => {
      findOne.mockResolvedValue(null);

      await service.resetPassword('raw-token', 'newPassword1');

      const where = (findOne.mock.calls[0] as [{ where: User }])[0].where;
      expect(where.resetToken).toBe(sha256('raw-token'));
    });

    it('hashes the new password, clears the token and bumps tokenVersion', async () => {
      const user = {
        id: 'u1',
        password: 'old-hash',
        resetToken: sha256('raw-token'),
        resetTokenExpiry: new Date(Date.now() + 1000),
        tokenVersion: 3,
      } as User;
      findOne.mockResolvedValue(user);

      const ok = await service.resetPassword('raw-token', 'newPassword1');

      expect(ok).toBe(true);
      expect(save).toHaveBeenCalledWith(user);
      // Password stored bcrypt-hashed, never as plaintext.
      expect(user.password).not.toBe('newPassword1');
      await expect(bcrypt.compare('newPassword1', user.password)).resolves.toBe(
        true,
      );
      // Single-use: the token is consumed.
      expect(user.resetToken).toBeNull();
      expect(user.resetTokenExpiry).toBeNull();
      // Every JWT issued before the reset is revoked via the version bump.
      expect(user.tokenVersion).toBe(4);
    });

    it('treats a missing tokenVersion as 0 and bumps it to 1', async () => {
      const user = {
        id: 'u1',
        password: 'old-hash',
        tokenVersion: undefined,
      } as unknown as User;
      findOne.mockResolvedValue(user);

      await service.resetPassword('raw-token', 'newPassword1');

      expect(user.tokenVersion).toBe(1);
    });

    it('round-trips: a token issued by createResetToken matches the reset lookup', async () => {
      const user = { id: 'u1', email: 'a@b.c' } as User;
      findOne.mockResolvedValue(user);
      const token = await service.createResetToken('a@b.c');

      // The repository only returns the user when the hashed lookup value
      // equals what createResetToken persisted.
      findOne.mockImplementation(
        ({ where }: { where: { resetToken: string } }) =>
          Promise.resolve(where.resetToken === user.resetToken ? user : null),
      );

      await expect(service.resetPassword(token!, 'newPassword1')).resolves.toBe(
        true,
      );
    });
  });

  describe('anonymize (GDPR erasure)', () => {
    function accountToDelete(): User {
      return {
        id: 'u1',
        email: 'shopper@example.com',
        password: 'bcrypt-hash-of-real-password',
        role: 'user',
        resetToken: sha256('pending-reset'),
        resetTokenExpiry: new Date(Date.now() + 1000),
        tokenVersion: 3,
        googleId: 'g-123',
        deletedAt: null,
      } as User;
    }

    it('is a no-op for an unknown user', async () => {
      findOne.mockResolvedValue(null);

      await service.anonymize('ghost');

      expect(save).not.toHaveBeenCalled();
    });

    it('destroys every personal field but keeps the row (orders reference it)', async () => {
      const user = accountToDelete();
      findOne.mockResolvedValue(user);

      await service.anonymize('u1');

      expect(save).toHaveBeenCalledWith(user);
      // The email becomes a per-user tombstone: no personal data, still
      // unique, and it frees shopper@example.com for a fresh registration.
      expect(user.email).toBe('deleted-u1@anonymized.invalid');
      // Any pending reset link dies with the account.
      expect(user.resetToken).toBeNull();
      expect(user.resetTokenExpiry).toBeNull();
      // Signing in with the same Google account later must not reach it.
      expect(user.googleId).toBeNull();
      expect(user.deletedAt).toBeInstanceOf(Date);
    });

    it('replaces the password with an unusable random hash', async () => {
      const user = accountToDelete();
      findOne.mockResolvedValue(user);

      await service.anonymize('u1');

      expect(user.password).not.toBe('bcrypt-hash-of-real-password');
      // Valid bcrypt output, but of 64 random hex chars nobody knows — so no
      // credential can ever match it.
      await expect(
        bcrypt.compare('bcrypt-hash-of-real-password', user.password),
      ).resolves.toBe(false);
    });

    it('bumps tokenVersion so every outstanding JWT is revoked immediately', async () => {
      const user = accountToDelete();
      findOne.mockResolvedValue(user);

      await service.anonymize('u1');

      expect(user.tokenVersion).toBe(4);
    });
  });
});

describe('UsersService.findOrCreateForGoogle', () => {
  const identity = {
    sub: 'g-123',
    email: 'owner@gmail.com',
    googleOwnsEmail: true,
  };
  let service: UsersService;
  let findOne: jest.Mock;
  let save: jest.Mock;
  let create: jest.Mock;

  beforeEach(() => {
    findOne = jest.fn().mockResolvedValue(null);
    save = jest.fn((user: User) => Promise.resolve(user));
    create = jest.fn((fields: Partial<User>) => ({ role: 'user', ...fields }));
    service = new UsersService({
      findOne,
      save,
      create,
    } as unknown as Repository<User>);
  });

  it('signs an already-linked account straight in, sessions untouched', async () => {
    const user = {
      id: 'u1',
      email: 'owner@gmail.com',
      role: 'user',
      tokenVersion: 4,
    } as User;
    findOne.mockResolvedValueOnce(user);

    const result = await service.findOrCreateForGoogle(identity, false);

    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith({ where: { googleId: 'g-123' } });
    expect(result.password).toBeUndefined();
    expect(result.tokenVersion).toBe(4);
  });

  it('links a password account with the same email, retiring its password and sessions', async () => {
    const user = {
      id: 'u1',
      email: 'Owner@Gmail.com',
      password: 'hash-set-by-whoever-registered',
      role: 'user',
      tokenVersion: 4,
      resetToken: 'pending',
      resetTokenExpiry: new Date(),
      googleId: null,
    } as User;
    findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(user);

    const result = await service.findOrCreateForGoogle(identity, false);

    expect(result.googleId).toBe('g-123');
    // Whoever registered the address first (maybe not its owner) loses the
    // password and every session they held.
    expect(result.password).not.toBe('hash-set-by-whoever-registered');
    expect(result.password).toMatch(/^\$2[aby]\$/);
    // Stored casing follows Google, so "Forgot password" finds the account.
    expect(result.email).toBe('owner@gmail.com');
    expect(result.tokenVersion).toBe(5);
    expect(result.resetToken).toBeNull();
    expect(result.role).toBe('user');
    expect(save).toHaveBeenCalledWith(user);
  });

  it('creates a new account with an unusable password when none exists', async () => {
    const result = await service.findOrCreateForGoogle(identity, false);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'owner@gmail.com', googleId: 'g-123' }),
    );
    expect(result.password).toMatch(/^\$2[aby]\$/);
    expect(result.role).toBe('user');
    expect(save).toHaveBeenCalled();
  });

  it('promotes the account to admin when grantAdmin is set', async () => {
    const created = await service.findOrCreateForGoogle(identity, true);
    expect(created.role).toBe('admin');

    const linked = { id: 'u1', role: 'user', googleId: 'g-123' } as User;
    findOne.mockResolvedValueOnce(linked);
    const promoted = await service.findOrCreateForGoogle(identity, true);
    expect(promoted.role).toBe('admin');
  });

  it('neither links nor creates an account for an address Google does not own', async () => {
    const outside = { sub: 'g-9', email: 'me@shop.pl', googleOwnsEmail: false };

    // No account with that address yet: still no new one.
    await expect(
      service.findOrCreateForGoogle(outside, true),
    ).rejects.toBeInstanceOf(BadRequestException);

    // An existing password account with it: not linked either.
    findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'u1', email: 'me@shop.pl' } as User);
    await expect(
      service.findOrCreateForGoogle(outside, true),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(create).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('never overwrites a link to another Google account', async () => {
    findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'u1',
      email: 'owner@gmail.com',
      googleId: 'g-other',
    } as User);

    await expect(
      service.findOrCreateForGoogle(identity, false),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(save).not.toHaveBeenCalled();
  });

  it('falls back to a case-insensitive email match', async () => {
    const user = {
      id: 'u1',
      email: 'Owner@Gmail.com',
      tokenVersion: 0,
    } as User;
    findOne
      .mockResolvedValueOnce(null) // googleId
      .mockResolvedValueOnce(null) // exact email
      .mockResolvedValueOnce(user); // LOWER(email)

    const result = await service.findOrCreateForGoogle(identity, false);

    expect(findOne).toHaveBeenCalledTimes(3);
    expect(result.googleId).toBe('g-123');
    expect(result.email).toBe('owner@gmail.com');
  });

  it('returns the account a concurrent first sign-in just created', async () => {
    const duplicate = new QueryFailedError('INSERT', [], {
      code: '23505',
    } as unknown as Error);
    save.mockRejectedValueOnce(duplicate);
    const winner = { id: 'u7', email: 'owner@gmail.com', role: 'user' } as User;
    findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(winner);

    await expect(service.findOrCreateForGoogle(identity, false)).resolves.toBe(
      winner,
    );
  });
});
