import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { cookieJwtExtractor } from '../auth-cookie';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tokenVersion?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      // Cookie first (the browser flow); Bearer stays as a fallback for
      // tests and non-browser API clients.
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieJwtExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    // Re-validate against the DB on every request so role changes take effect
    // immediately and password resets revoke previously issued tokens.
    const user = await this.usersService.findById(payload.sub);
    // A deleted (anonymized) account is treated exactly like a missing one.
    // Its tokenVersion bump revokes old JWTs anyway; this check makes the
    // intent explicit and closes the gap for any token minted mid-deletion.
    if (!user || user.deletedAt) {
      throw new UnauthorizedException();
    }
    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Token has been revoked');
    }
    return { userId: user.id, email: user.email, role: user.role };
  }
}
