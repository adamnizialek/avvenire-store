import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { GoogleIdTokenVerifier } from './google-id-token.verifier';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    create: jest.Mock;
    findByEmail: jest.Mock;
    createResetToken: jest.Mock;
    resetPassword: jest.Mock;
    findOrCreateForGoogle: jest.Mock;
  };
  let signAsync: jest.Mock;
  let sendPasswordReset: jest.Mock;
  let google: { clientId: string | null; verify: jest.Mock };
  let env: Record<string, string>;

  beforeEach(() => {
    usersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      createResetToken: jest.fn(),
      resetPassword: jest.fn(),
      findOrCreateForGoogle: jest.fn(),
    };
    signAsync = jest.fn().mockResolvedValue('signed.jwt');
    sendPasswordReset = jest.fn().mockResolvedValue(undefined);
    google = { clientId: 'client-id', verify: jest.fn() };
    env = {};
    service = new AuthService(
      usersService as unknown as UsersService,
      { signAsync } as unknown as JwtService,
      {
        get: (key: string, defaultValue?: unknown): unknown =>
          key in env ? env[key] : defaultValue,
      } as unknown as ConfigService,
      { sendPasswordReset } as unknown as MailService,
      google as unknown as GoogleIdTokenVerifier,
    );
  });

  describe('login', () => {
    it('embeds the CURRENT tokenVersion in the JWT so a later reset revokes it', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        role: 'user',
        tokenVersion: 5,
        password: await bcrypt.hash('correct-password', 4),
      });

      await service.login({ email: 'a@b.c', password: 'correct-password' });

      expect(signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'u1', tokenVersion: 5 }),
      );
    });

    it('rejects a wrong password with the same error as an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        role: 'user',
        tokenVersion: 0,
        password: await bcrypt.hash('correct-password', 4),
      });

      const wrongPassword = service.login({
        email: 'a@b.c',
        password: 'wrong-password',
      });
      await expect(wrongPassword).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );

      usersService.findByEmail.mockResolvedValue(null);
      const unknownEmail = service.login({
        email: 'nobody@b.c',
        password: 'whatever1',
      });
      // Identical message: the response must not reveal which part was wrong.
      await expect(unknownEmail).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });
  });

  describe('forgotPassword', () => {
    it('emails a reset link carrying the raw token for a known account', async () => {
      usersService.createResetToken.mockResolvedValue('raw-token-123');

      await service.forgotPassword('a@b.c');
      // The send is fire-and-forget; let the microtask queue drain.
      await new Promise((resolve) => setImmediate(resolve));

      expect(sendPasswordReset).toHaveBeenCalledWith(
        'a@b.c',
        expect.stringContaining('/reset-password?token=raw-token-123'),
      );
    });

    it('returns the exact same response whether or not the account exists', async () => {
      usersService.createResetToken.mockResolvedValue('raw-token-123');
      const known = await service.forgotPassword('a@b.c');

      usersService.createResetToken.mockResolvedValue(null);
      const unknown = await service.forgotPassword('nobody@b.c');

      // No enumeration oracle: byte-identical bodies.
      expect(unknown).toEqual(known);
    });

    it('does not email unknown accounts', async () => {
      usersService.createResetToken.mockResolvedValue(null);

      await service.forgotPassword('nobody@b.c');
      await new Promise((resolve) => setImmediate(resolve));

      expect(sendPasswordReset).not.toHaveBeenCalled();
    });

    it('still succeeds when the mail provider fails (no 500 oracle)', async () => {
      usersService.createResetToken.mockResolvedValue('raw-token-123');
      sendPasswordReset.mockRejectedValue(new Error('resend down'));

      await expect(service.forgotPassword('a@b.c')).resolves.toEqual(
        expect.objectContaining({ message: expect.any(String) as string }),
      );
      await new Promise((resolve) => setImmediate(resolve));
    });
  });

  describe('resetPassword', () => {
    it('maps a consumed/invalid token to a 400', async () => {
      usersService.resetPassword.mockResolvedValue(false);

      await expect(
        service.resetPassword('stale-token', 'newPassword1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reports success when the token was valid', async () => {
      usersService.resetPassword.mockResolvedValue(true);

      await expect(
        service.resetPassword('good-token', 'newPassword1'),
      ).resolves.toEqual({ message: 'Password has been reset successfully.' });
      expect(usersService.resetPassword).toHaveBeenCalledWith(
        'good-token',
        'newPassword1',
      );
    });
  });

  describe('loginWithGoogle', () => {
    const identity = { sub: 'g-123', email: 'owner@gmail.com' };
    const linkedUser = {
      id: 'u1',
      email: 'owner@gmail.com',
      role: 'user',
      tokenVersion: 2,
    };

    it('signs in the account for a verified Google identity', async () => {
      google.verify.mockResolvedValue(identity);
      usersService.findOrCreateForGoogle.mockResolvedValue(linkedUser);

      const result = await service.loginWithGoogle('id-token');

      expect(google.verify).toHaveBeenCalledWith('id-token');
      expect(usersService.findOrCreateForGoogle).toHaveBeenCalledWith(
        identity,
        false,
      );
      expect(signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'u1', tokenVersion: 2 }),
      );
      expect(result.user).toEqual({
        id: 'u1',
        email: 'owner@gmail.com',
        role: 'user',
      });
    });

    it('grants admin only to emails listed in ADMIN_EMAILS (any case, spaces)', async () => {
      env.ADMIN_EMAILS = ' someone@else.com , Owner@Gmail.com ';
      google.verify.mockResolvedValue(identity);
      usersService.findOrCreateForGoogle.mockResolvedValue(linkedUser);

      await service.loginWithGoogle('id-token');

      expect(usersService.findOrCreateForGoogle).toHaveBeenCalledWith(
        identity,
        true,
      );
    });

    it('rejects a token the verifier does not accept, touching no account', async () => {
      google.verify.mockResolvedValue(null);

      await expect(service.loginWithGoogle('forged')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(usersService.findOrCreateForGoogle).not.toHaveBeenCalled();
    });

    it('answers 503 when Google sign-in is not configured', async () => {
      google.clientId = null;

      await expect(service.loginWithGoogle('id-token')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(google.verify).not.toHaveBeenCalled();
    });
  });
});
