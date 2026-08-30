import { Request } from 'express';

/** Shape returned by JwtStrategy.validate and attached to req.user. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
