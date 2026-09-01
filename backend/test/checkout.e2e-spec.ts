import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import Stripe from 'stripe';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Product } from '../src/modules/products/entities/product.entity';
import { StripeService } from '../src/modules/stripe/stripe.service';

/**
 * The order → checkout → webhook → paid happy path, end to end against a real
 * Postgres (started by test/run-e2e.mjs) with the real migrations applied.
 *
 * Only the outbound Stripe API (checkout.sessions.create) is stubbed — the
 * inbound webhook goes through Stripe's REAL signature verification, signed
 * with the same helper Stripe uses (`generateTestHeaderString`).
 */

if (!process.env.E2E_BOOTSTRAPPED) {
  throw new Error(
    'E2E env is not set up. Run this suite via `npm run test:e2e` ' +
      '(test/run-e2e.mjs starts the database and wires the env).',
  );
}

jest.setTimeout(30_000);

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const SESSION_ID = 'cs_test_e2e_session_1';

interface UserBody {
  user: { id: string; email: string; role: string };
}
interface OrderBody {
  id: string;
  status: string;
  totalAmount: number;
}

describe('Checkout happy path (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let server: App;
  // Signs webhook payloads exactly like Stripe's CLI/test helpers do.
  const stripeSigner = new Stripe('sk_test_e2e_dummy');

  let authCookie: string;
  let productId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Mirror the request pipeline from src/main.ts that these routes rely on:
    // rawBody for webhook signatures, cookies for auth, the /api prefix and
    // the same validation behaviour.
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

    // Stub ONLY the outbound Stripe API (a private field, so tests reach in).
    // `webhooks` stays real so the webhook test exercises actual signature
    // verification.
    const stripeService: unknown = app.get(StripeService);
    const svc = stripeService as { stripe: { checkout: unknown } };
    svc.stripe.checkout = {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: SESSION_ID,
          url: 'https://checkout.stripe.com/c/pay/e2e-test',
        }),
        expire: jest.fn(),
      },
    };
  });

  afterAll(async () => {
    await app.close();
  });

  function signedWebhook(payload: string, secret = WEBHOOK_SECRET) {
    const signature = stripeSigner.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    return request(server)
      .post('/api/stripe/webhook')
      .set('stripe-signature', signature)
      .set('content-type', 'application/json')
      .send(payload);
  }

  function completedEventPayload() {
    return JSON.stringify({
      id: 'evt_e2e_completed_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: SESSION_ID,
          object: 'checkout.session',
          payment_status: 'paid',
          metadata: { orderId },
        },
      },
    });
  }

  async function inventoryOf(id: string) {
    const product = await dataSource
      .getRepository(Product)
      .findOneByOrFail({ id });
    return product.inventory;
  }

  it('registers a shopper and gets the JWT as an httpOnly cookie', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({ email: 'shopper@e2e.test', password: 'sup3r-secret' })
      .expect(201);

    const cookies = res.headers['set-cookie'] as unknown as string[];
    authCookie = cookies.find((c) => c.startsWith('access_token='))!;
    expect(authCookie).toContain('HttpOnly');
    // The token must never appear in the response body.
    expect(JSON.stringify(res.body)).not.toContain(
      authCookie.split(';')[0].split('=')[1],
    );
    expect((res.body as UserBody).user.email).toBe('shopper@e2e.test');
  });

  it('rejects an unauthenticated order attempt', async () => {
    await request(server).post('/api/orders').send({ items: [] }).expect(401);
  });

  it('creates a pending order and reserves the stock', async () => {
    const product = await dataSource.getRepository(Product).save({
      name: 'E2E Trench Coat',
      description: 'A coat that exists only in tests',
      price: 129.99,
      inventory: [{ size: 'M', quantity: 2 }],
      images: [],
    });
    productId = product.id;

    const res = await request(server)
      .post('/api/orders')
      .set('Cookie', authCookie)
      .send({ items: [{ productId, quantity: 1, size: 'M' }] })
      .expect(201);

    const order = res.body as OrderBody;
    orderId = order.id;
    expect(order.status).toBe('pending');
    expect(Number(order.totalAmount)).toBeCloseTo(129.99);
    await expect(inventoryOf(productId)).resolves.toEqual([
      { size: 'M', quantity: 1 },
    ]);
  });

  it('creates a checkout session and links it to the order', async () => {
    const res = await request(server)
      .post('/api/stripe/create-checkout-session')
      .set('Cookie', authCookie)
      .send({ orderId })
      .expect(201);

    expect(res.body).toEqual({
      sessionId: SESSION_ID,
      url: 'https://checkout.stripe.com/c/pay/e2e-test',
    });

    // The session id is persisted so the webhook/success page can find it.
    const bySession = await request(server)
      .get(`/api/orders/session/${SESSION_ID}`)
      .set('Cookie', authCookie)
      .expect(200);
    expect(bySession.body).toEqual({ id: orderId, status: 'pending' });
  });

  it('rejects a webhook signed with the wrong secret', async () => {
    await signedWebhook(
      completedEventPayload(),
      'whsec_attacker_forged',
    ).expect(400);

    // The order must be untouched.
    const res = await request(server)
      .get(`/api/orders/${orderId}`)
      .set('Cookie', authCookie)
      .expect(200);
    expect((res.body as OrderBody).status).toBe('pending');
  });

  it('marks the order paid on a correctly signed checkout.session.completed', async () => {
    const res = await signedWebhook(completedEventPayload()).expect(201);
    expect(res.body).toEqual({ received: true });

    const order = await request(server)
      .get(`/api/orders/${orderId}`)
      .set('Cookie', authCookie)
      .expect(200);
    expect((order.body as OrderBody).status).toBe('completed');
  });

  it('is idempotent when Stripe redelivers the same event', async () => {
    const res = await signedWebhook(completedEventPayload()).expect(201);
    expect(res.body).toEqual({ received: true });

    const order = await request(server)
      .get(`/api/orders/${orderId}`)
      .set('Cookie', authCookie)
      .expect(200);
    expect((order.body as OrderBody).status).toBe('completed');
    // The reservation from the original order still stands — no double effect.
    await expect(inventoryOf(productId)).resolves.toEqual([
      { size: 'M', quantity: 1 },
    ]);
  });
});
