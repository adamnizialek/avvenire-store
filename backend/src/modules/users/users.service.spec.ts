import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
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
});
