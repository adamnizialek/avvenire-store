import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  GoogleIdTokenVerifier,
  type GoogleIdentity,
} from '../src/modules/auth/google-id-token.verifier';

/**
 * "Sign in with Google" against a real Postgres with the real migrations
 * (googleId column included). Only Google itself is faked: the verifier maps
 * a test credential straight to an identity.
 */

if (!process.env.E2E_BOOTSTRAPPED) {
  throw new Error(
    'E2E env is not set up. Run this suite via `npm run test:e2e` ' +
      '(test/run-e2e.mjs starts the database and wires the env).',
  );
}

jest.setTimeout(30_000);

const OWNER = 'owner@google.e2e.test';
const IDENTITIES: Record<string, GoogleIdentity> = {
  'owner-token': { sub: 'google-owner', email: OWNER, googleOwnsEmail: true },
  'shopper-token': {
    sub: 'google-shopper',
    email: 'shopper@google.e2e.test',
    googleOwnsEmail: true,
  },
};

const fakeGoogle = {
  clientId: 'e2e-client-id',
  verify: (credential: string) =>
    Promise.resolve(IDENTITIES[credential] ?? null),
};

function authCookieOf(res: request.Response): string {
  const cookies = res.headers['set-cookie'] as unknown as string[];
  return cookies.find((c) => c.startsWith('access_token='))!;
}

interface UserBody {
  user: { id: string; email: string; role: string };
}

describe('Sign in with Google (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let ownerId: string;
  let ownerCookie: string;

  beforeAll(async () => {
    process.env.ADMIN_EMAILS = OWNER;
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleIdTokenVerifier)
      .useValue(fakeGoogle)
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({
      rawBody: true,
      logger: false,
    });
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    delete process.env.ADMIN_EMAILS;
    await app.close();
  });

  it('serves the client id the button needs', async () => {
    await request(server)
      .get('/api/auth/google/config')
      .expect(200, { clientId: 'e2e-client-id' });
  });

  it('rejects a credential Google did not issue', async () => {
    await request(server)
      .post('/api/auth/google')
      .send({ credential: 'forged' })
      .expect(401);
  });

  it("takes over a squatter's password account and makes the ADMIN_EMAILS owner admin", async () => {
    // Someone registers the owner's address with their own password first.
    const squat = await request(server)
      .post('/api/auth/register')
      .send({ email: 'Owner@Google.E2E.test', password: 'squatter-pass' })
      .expect(201);
    const squatterCookie = authCookieOf(squat);

    const res = await request(server)
      .post('/api/auth/google')
      .send({ credential: 'owner-token' })
      .expect(201);
    const body = res.body as UserBody;
    expect(body.user.role).toBe('admin');
    expect(body.user.id).toBe((squat.body as UserBody).user.id);
    // Stored casing now follows Google, so "Forgot password" can find it.
    expect(body.user.email).toBe(OWNER);
    ownerId = body.user.id;
    ownerCookie = authCookieOf(res);

    // The real owner is in, with admin rights the server re-reads per request…
    const profile = await request(server)
      .get('/api/auth/profile')
      .set('Cookie', authCookieOf(res))
      .expect(200);
    expect((profile.body as { role: string }).role).toBe('admin');

    // …and the squatter's password and session are both dead.
    await request(server)
      .post('/api/auth/login')
      .send({ email: 'Owner@Google.E2E.test', password: 'squatter-pass' })
      .expect(401);
    await request(server)
      .get('/api/auth/profile')
      .set('Cookie', squatterCookie)
      .expect(401);
  });

  it('signs the owner back into the same account, other sessions intact', async () => {
    const again = await request(server)
      .post('/api/auth/google')
      .send({ credential: 'owner-token' })
      .expect(201);
    expect((again.body as UserBody).user.id).toBe(ownerId);
    // A repeat sign-in doesn't log the owner's other devices out.
    await request(server)
      .get('/api/auth/profile')
      .set('Cookie', ownerCookie)
      .expect(200);
  });

  // /auth/google allows 5 calls a minute; this is the 4th and 5th.
  it('creates a plain customer account for anyone else, which can delete itself with Google', async () => {
    const res = await request(server)
      .post('/api/auth/google')
      .send({ credential: 'shopper-token' })
      .expect(201);
    const shopper = (res.body as UserBody).user;
    expect(shopper).toMatchObject({
      email: 'shopper@google.e2e.test',
      role: 'user',
    });
    const cookie = authCookieOf(res);

    // It has no password it could type…
    await request(server)
      .delete('/api/users/me')
      .set('Cookie', cookie)
      .send({ password: 'guess' })
      .expect(403);

    // …so it confirms with its Google account instead.
    await request(server)
      .delete('/api/users/me')
      .set('Cookie', cookie)
      .send({ googleCredential: 'shopper-token' })
      .expect(200);

    // Signing in with Google again starts a fresh account, not the tombstone.
    const again = await request(server)
      .post('/api/auth/google')
      .send({ credential: 'shopper-token' })
      .expect(201);
    expect((again.body as UserBody).user.id).not.toBe(shopper.id);
  });
});
