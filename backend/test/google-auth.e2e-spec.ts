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
  'owner-token': { sub: 'google-owner', email: OWNER },
  'shopper-token': { sub: 'google-shopper', email: 'shopper@google.e2e.test' },
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

  it('signs the owner back into the same account next time', async () => {
    const first = await request(server)
      .post('/api/auth/google')
      .send({ credential: 'owner-token' })
      .expect(201);
    const firstCookie = authCookieOf(first);

    const again = await request(server)
      .post('/api/auth/google')
      .send({ credential: 'owner-token' })
      .expect(201);
    expect((again.body as UserBody).user.id).toBe(
      (first.body as UserBody).user.id,
    );
    // A repeat sign-in doesn't log the owner's other devices out.
    await request(server)
      .get('/api/auth/profile')
      .set('Cookie', firstCookie)
      .expect(200);
  });

  it('creates a regular customer account for anyone else', async () => {
    const res = await request(server)
      .post('/api/auth/google')
      .send({ credential: 'shopper-token' })
      .expect(201);
    expect((res.body as UserBody).user).toMatchObject({
      email: 'shopper@google.e2e.test',
      role: 'user',
    });
  });
});
