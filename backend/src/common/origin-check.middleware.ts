import type { NextFunction, Request, Response } from 'express';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF defense required because the auth cookie is SameSite=None in
 * production (cross-site Vercel -> Render): browsers attach it to any
 * cross-site request, so we reject mutations whose Origin is not ours.
 *
 * Browsers always send Origin on cross-site mutations, so a missing header
 * means a non-browser client (Stripe webhooks, curl, tests) — those carry no
 * ambient cookie and are allowed through. Safe methods are never blocked.
 */
export function makeOriginCheck(allowedOrigins: string[]) {
  const allowed = new Set(allowedOrigins);
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    if (!MUTATING_METHODS.has(req.method) || !origin || allowed.has(origin)) {
      next();
      return;
    }
    res.status(403).json({
      statusCode: 403,
      message: 'Cross-origin request rejected',
    });
  };
}
