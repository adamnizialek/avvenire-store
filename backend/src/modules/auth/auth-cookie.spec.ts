import { ConfigService } from '@nestjs/config';
import {
  AUTH_COOKIE,
  authCookieOptions,
  cookieJwtExtractor,
} from './auth-cookie';

function makeConfig(env: Record<string, string>): ConfigService {
  return {
    get: (key: string, defaultValue?: unknown): unknown =>
      key in env ? env[key] : defaultValue,
  } as unknown as ConfigService;
}

describe('cookieJwtExtractor', () => {
  it('reads the token from the auth cookie', () => {
    const req = { cookies: { [AUTH_COOKIE]: 'jwt-abc' } };
    expect(cookieJwtExtractor(req as never)).toBe('jwt-abc');
  });

  it('returns null when the cookie is absent', () => {
    expect(cookieJwtExtractor({ cookies: {} } as never)).toBeNull();
    expect(cookieJwtExtractor({} as never)).toBeNull();
  });
});

describe('authCookieOptions', () => {
  it('is httpOnly + Secure + SameSite=None in production (cross-site Vercel -> Render)', () => {
    const options = authCookieOptions(makeConfig({ NODE_ENV: 'production' }));
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe('none');
  });

  it('relaxes to SameSite=Lax without Secure in development', () => {
    const options = authCookieOptions(makeConfig({}));
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe('lax');
  });

  it('expires together with the 7-day JWT', () => {
    const options = authCookieOptions(makeConfig({}));
    expect(options.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
