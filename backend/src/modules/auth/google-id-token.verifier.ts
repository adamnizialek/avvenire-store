import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleIdentity {
  /** Google's stable account id (the token's `sub`). */
  sub: string;
  /** Lower-cased, and only ever an address Google has verified. */
  email: string;
}

/**
 * Verifies the ID token the "Sign in with Google" button hands the frontend.
 * Kept apart from AuthService so tests can swap it out without minting real
 * Google-signed tokens.
 */
@Injectable()
export class GoogleIdTokenVerifier {
  private readonly logger = new Logger(GoogleIdTokenVerifier.name);
  private readonly client = new OAuth2Client();

  constructor(private configService: ConfigService) {}

  /** The OAuth client id, or null when Google sign-in isn't configured. */
  get clientId(): string | null {
    return this.configService.get<string>('GOOGLE_CLIENT_ID') || null;
  }

  /**
   * Returns the identity for a genuine token issued to OUR client id, or null
   * for anything else (bad signature, expired, other audience, unverified
   * email). verifyIdToken checks signature, expiry, issuer and audience.
   */
  async verify(credential: string): Promise<GoogleIdentity | null> {
    const clientId = this.clientId;
    if (!clientId) return null;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        return null;
      }
      return { sub: payload.sub, email: payload.email.toLowerCase() };
    } catch (err) {
      this.logger.warn(`Rejected a Google ID token: ${(err as Error).message}`);
      return null;
    }
  }
}
