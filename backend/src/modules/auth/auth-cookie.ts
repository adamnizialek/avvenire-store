import type { CookieOptions, Request } from 'express';
import { ConfigService } from '@nestjs/config';

export const AUTH_COOKIE = 'access_token';

/** Must match the JWT's expiresIn ('7d' in AuthModule). */
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * httpOnly keeps the token out of reach of page scripts (the point of #7).
 * Production runs cross-site (Vercel frontend -> Render API), which requires
 * SameSite=None + Secure; the CSRF exposure that opens is covered by the
 * origin-check middleware. Dev is same-site (Vite proxy / localhost), where
 * Lax works and plain http is allowed.
 */
export function authCookieOptions(config: ConfigService): CookieOptions {
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
    path: '/',
  };
}

export function cookieJwtExtractor(req: Request): string | null {
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[AUTH_COOKIE] ?? null;
}
