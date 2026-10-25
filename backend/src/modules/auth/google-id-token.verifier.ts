import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleIdentity {
  /** Google's stable account id (the token's `sub`). */
  sub: string;
  /** Lower-cased, and only ever an address Google has verified. */
  email: string;
  /**
   * Google is the authority for the address (Gmail, or a Workspace domain):
   * whoever holds this Google account holds the mailbox today. For any other
   * address Google only checked it once, at sign-up, so the address alone
   * must not unlock an existing account or admin rights.
   */
  googleOwnsEmail: boolean;
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
      const email = payload.email.toLowerCase();
      return {
        sub: payload.sub,
        email,
        googleOwnsEmail:
          /@(gmail|googlemail)\.com$/.test(email) || Boolean(payload.hd),
      };
    } catch (err) {
      this.logger.warn(`Rejected a Google ID token: ${(err as Error).message}`);
      return null;
    }
  }
}
