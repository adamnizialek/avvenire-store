import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Order } from '../src/modules/orders/entities/order.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { User } from '../src/modules/users/entities/user.entity';

/**
 * The GDPR self-service flow, end to end against a real Postgres (started by
 * test/run-e2e.mjs) with the real migrations applied: export everything,
 * delete the account, and prove that the person is gone while the order rows
 * (tax retention) remain.
 */

if (!process.env.E2E_BOOTSTRAPPED) {
  throw new Error(
    'E2E env is not set up. Run this suite via `npm run test:e2e` ' +
      '(test/run-e2e.mjs starts the database and wires the env).',
  );
}

jest.setTimeout(30_000);

const EMAIL = 'gdpr@e2e.test';
const PASSWORD = 'sup3r-secret';

interface ExportBody {
  exportedAt: string;
  user: { id: string; email: string };
  orders: {
    id: string;
    status: string;
    items: { product: string | null; quantity: number; size: string | null }[];
  }[];
}

describe('GDPR self-service (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let server: App;

  let authCookie: string;
  let userId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers an account and places an order', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({ email: EMAIL, password: PASSWORD })
      .expect(201);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    authCookie = cookies.find((c) => c.startsWith('access_token='))!;
    userId = (res.body as { user: { id: string } }).user.id;

    const product = await dataSource.getRepository(Product).save({
      name: 'GDPR Test Scarf',
      description: 'Exists only to be exported',
      price: 49.99,
      inventory: [{ size: 'OS', quantity: 5 }],
      images: [],
    });

    const order = await request(server)
      .post('/api/orders')
      .set('Cookie', authCookie)
      .send({ items: [{ productId: product.id, quantity: 1, size: 'OS' }] })
      .expect(201);
    orderId = (order.body as { id: string }).id;
  });

  it('exports the personal data and full order history as JSON', async () => {
    const res = await request(server)
      .get('/api/users/me/export')
      .set('Cookie', authCookie)
      .expect(200);

    const body = res.body as ExportBody;
    expect(body.user).toMatchObject({ id: userId, email: EMAIL });
    expect(body.orders).toHaveLength(1);
    expect(body.orders[0]).toMatchObject({ id: orderId, status: 'pending' });
    expect(body.orders[0].items).toEqual([
      expect.objectContaining({
        product: 'GDPR Test Scarf',
        quantity: 1,
        size: 'OS',
      }),
    ]);
    // Secrets stay out of the export even though they live on the same row.
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('password');
    expect(raw).not.toContain('tokenVersion');
  });

  it('refuses deletion without the correct password (403, session intact)', async () => {
    await request(server)
      .delete('/api/users/me')
      .set('Cookie', authCookie)
      .send({ password: 'not-my-password' })
      .expect(403);

    // The typo must not have logged the user out or touched the account.
    await request(server)
      .get('/api/auth/profile')
      .set('Cookie', authCookie)
      .expect(200);
  });

  it('deletes the account with the correct password and clears the cookie', async () => {
    const res = await request(server)
      .delete('/api/users/me')
      .set('Cookie', authCookie)
      .send({ password: PASSWORD })
      .expect(200);

    expect((res.body as { message: string }).message).toContain('deleted');
    const cleared = (res.headers['set-cookie'] as unknown as string[]).find(
      (c) => c.startsWith('access_token='),
    )!;
    expect(cleared).toContain('access_token=;');
  });

  it('revokes the old session: the pre-deletion cookie is now a 401', async () => {
    await request(server)
      .get('/api/auth/profile')
      .set('Cookie', authCookie)
      .expect(401);
  });

  it('blocks any future login with the old credentials', async () => {
    await request(server)
      .post('/api/auth/login')
      .send({ email: EMAIL, password: PASSWORD })
      .expect(401);
  });

  it('anonymized the user row but retained the order row', async () => {
    const user = await dataSource.getRepository(User).findOneByOrFail({
      id: userId,
    });
    expect(user.email).toBe(`deleted-${userId}@anonymized.invalid`);
    expect(user.deletedAt).toBeInstanceOf(Date);

    // The tax-retention requirement: the order survives, still linked to the
    // (now anonymous) row.
    const order = await dataSource.getRepository(Order).findOneByOrFail({
      id: orderId,
    });
    expect(order.userId).toBe(userId);
  });

  it('frees the email address for a completely fresh registration', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({ email: EMAIL, password: 'brand-new-pass1' })
      .expect(201);

    // A new identity, not a resurrection of the deleted one.
    expect((res.body as { user: { id: string } }).user.id).not.toBe(userId);
  });
});
