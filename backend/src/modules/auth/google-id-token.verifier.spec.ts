import { ConfigService } from '@nestjs/config';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { GoogleIdTokenVerifier } from './google-id-token.verifier';

function makeVerifier(clientId?: string) {
  return new GoogleIdTokenVerifier({
    get: (key: string): unknown =>
      key === 'GOOGLE_CLIENT_ID' ? clientId : undefined,
  } as unknown as ConfigService);
}

describe('GoogleIdTokenVerifier', () => {
  let verifyIdToken: jest.SpyInstance;

  function googleSays(payload: Partial<TokenPayload>) {
    verifyIdToken.mockResolvedValue({ getPayload: () => payload });
  }

  beforeEach(() => {
    verifyIdToken = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
  });

  afterEach(() => verifyIdToken.mockRestore());

  it('checks the token against OUR client id and returns sub + lower-cased email', async () => {
    googleSays({ sub: 'g-1', email: 'Owner@Gmail.com', email_verified: true });

    await expect(makeVerifier('client-id').verify('tok')).resolves.toEqual({
      sub: 'g-1',
      email: 'owner@gmail.com',
      googleOwnsEmail: true,
    });
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'tok',
      audience: 'client-id',
    });
  });

  it('marks Workspace addresses as Google-owned and others as not', async () => {
    const verifier = makeVerifier('client-id');

    googleSays({
      sub: 'g-2',
      email: 'me@firm.pl',
      email_verified: true,
      hd: 'firm.pl',
    });
    await expect(verifier.verify('tok')).resolves.toMatchObject({
      googleOwnsEmail: true,
    });

    googleSays({ sub: 'g-3', email: 'me@shop.pl', email_verified: true });
    await expect(verifier.verify('tok')).resolves.toMatchObject({
      googleOwnsEmail: false,
    });
  });

  it('rejects an email Google has not verified', async () => {
    googleSays({ sub: 'g-1', email: 'owner@gmail.com', email_verified: false });

    await expect(makeVerifier('client-id').verify('tok')).resolves.toBeNull();
  });

  it('rejects a token Google refuses (bad signature, expired, other audience)', async () => {
    verifyIdToken.mockRejectedValue(new Error('Wrong recipient'));

    await expect(makeVerifier('client-id').verify('tok')).resolves.toBeNull();
  });

  it('accepts nothing when no client id is configured', async () => {
    const verifier = makeVerifier(undefined);

    expect(verifier.clientId).toBeNull();
    await expect(verifier.verify('tok')).resolves.toBeNull();
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});
