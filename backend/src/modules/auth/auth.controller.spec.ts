import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_COOKIE } from './auth-cookie';

describe('AuthController cookie-based auth', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    loginWithGoogle: jest.Mock;
    googleClientId: jest.Mock;
  };
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };

  beforeEach(() => {
    authService = {
      register: jest.fn().mockResolvedValue({
        access_token: 'jwt-abc',
        user: { id: 'u1', email: 'a@b.c', role: 'user' },
      }),
      login: jest.fn().mockResolvedValue({
        access_token: 'jwt-abc',
        user: { id: 'u1', email: 'a@b.c', role: 'user' },
      }),
      loginWithGoogle: jest.fn().mockResolvedValue({
        access_token: 'jwt-abc',
        user: { id: 'u1', email: 'a@b.c', role: 'admin' },
      }),
      googleClientId: jest.fn().mockReturnValue('client-id'),
    };
    res = { cookie: jest.fn(), clearCookie: jest.fn() };
    controller = new AuthController(
      authService as unknown as AuthService,
      {
        get: (_key: string, defaultValue?: unknown): unknown => defaultValue,
      } as unknown as ConfigService,
    );
  });

  it('login sets the JWT as an httpOnly cookie and returns only the user', async () => {
    const body = await controller.login(
      { email: 'a@b.c', password: 'x' },
      res as unknown as Response,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      AUTH_COOKIE,
      'jwt-abc',
      expect.objectContaining({ httpOnly: true }),
    );
    // The token must NOT reach the response body (it would end up readable
    // by page scripts again).
    expect(JSON.stringify(body)).not.toContain('jwt-abc');
    expect(body.user).toEqual({ id: 'u1', email: 'a@b.c', role: 'user' });
  });

  it('register sets the cookie the same way', async () => {
    const body = await controller.register(
      { email: 'a@b.c', password: 'x' },
      res as unknown as Response,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      AUTH_COOKIE,
      'jwt-abc',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(JSON.stringify(body)).not.toContain('jwt-abc');
  });

  it('Google sign-in sets the cookie the same way', async () => {
    const body = await controller.loginWithGoogle(
      { credential: 'google-id-token' },
      res as unknown as Response,
    );

    expect(authService.loginWithGoogle).toHaveBeenCalledWith('google-id-token');
    expect(res.cookie).toHaveBeenCalledWith(
      AUTH_COOKIE,
      'jwt-abc',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(JSON.stringify(body)).not.toContain('jwt-abc');
  });

  it('exposes the public Google client id for the button', () => {
    expect(controller.googleConfig()).toEqual({ clientId: 'client-id' });
  });

  it('logout clears the auth cookie', () => {
    controller.logout(res as unknown as Response);
    expect(res.clearCookie).toHaveBeenCalledWith(
      AUTH_COOKIE,
      expect.objectContaining({ httpOnly: true }),
    );
  });
});
