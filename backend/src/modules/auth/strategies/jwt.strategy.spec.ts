import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy tokenVersion revocation', () => {
  let strategy: JwtStrategy;
  let findById: jest.Mock;

  const payload = {
    sub: 'u1',
    email: 'a@b.c',
    role: 'user',
    tokenVersion: 1,
  };

  beforeEach(() => {
    findById = jest.fn();
    const config = {
      get: jest.fn(() => 'test-secret'),
    } as unknown as ConfigService;
    strategy = new JwtStrategy(config, {
      findById,
    } as unknown as UsersService);
  });

  it('accepts a token whose version matches the user record', async () => {
    findById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      role: 'user',
      tokenVersion: 1,
    });

    await expect(strategy.validate(payload)).resolves.toEqual({
      userId: 'u1',
      email: 'a@b.c',
      role: 'user',
    });
  });

  it('rejects a stale token after a password reset bumped tokenVersion', async () => {
    // The user reset their password (tokenVersion 1 -> 2); this token — e.g.
    // one stolen before the reset — still carries version 1.
    findById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      role: 'user',
      tokenVersion: 2,
    });

    await expect(strategy.validate(payload)).rejects.toThrow(
      new UnauthorizedException('Token has been revoked'),
    );
  });

  it('rejects a token for a user that no longer exists', async () => {
    findById.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token for a deleted (anonymized) account, even with a matching version', async () => {
    findById.mockResolvedValue({
      id: 'u1',
      email: 'deleted-u1@anonymized.invalid',
      role: 'user',
      tokenVersion: 1,
      deletedAt: new Date(),
    });

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('treats a missing tokenVersion claim as version 0', async () => {
    findById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      role: 'user',
      tokenVersion: 0,
    });

    await expect(
      strategy.validate({ sub: 'u1', email: 'a@b.c', role: 'user' }),
    ).resolves.toMatchObject({ userId: 'u1' });
  });

  it('uses the DB role, not the token role, so demotions apply immediately', async () => {
    findById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      role: 'user',
      tokenVersion: 1,
    });

    const result = await strategy.validate({ ...payload, role: 'admin' });

    expect(result.role).toBe('user');
  });
});
