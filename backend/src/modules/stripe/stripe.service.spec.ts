import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { StripeService } from './stripe.service';
import { OrdersService } from '../orders/orders.service';

function makeEvent(type: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt_123',
    type,
    data: {
      object: {
        metadata: { orderId: 'order-1' },
        payment_status: 'paid',
        ...overrides,
      },
    },
  };
}

describe('StripeService webhook idempotency', () => {
  let service: StripeService;
  let ordersService: { markPaid: jest.Mock; cancelAndRestock: jest.Mock };
  let manager: { query: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  function stubConstructEvent(event: unknown) {
    const svc = service as unknown as {
      stripe: { webhooks: { constructEvent: jest.Mock } };
    };
    svc.stripe = {
      webhooks: { constructEvent: jest.fn(() => event) },
    };
  }

  beforeEach(() => {
    ordersService = {
      markPaid: jest.fn().mockResolvedValue(undefined),
      cancelAndRestock: jest.fn().mockResolvedValue(undefined),
    };
    // First-sight by default: the INSERT ... RETURNING yields a row.
    manager = { query: jest.fn().mockResolvedValue([{ id: 'evt_123' }]) };
    dataSource = {
      transaction: jest.fn((cb: (m: EntityManager) => unknown) =>
        cb(manager as unknown as EntityManager),
      ),
    };
    const config = {
      get: jest.fn(() => 'test-value'),
    };
    service = new StripeService(
      config as unknown as ConfigService,
      ordersService as unknown as OrdersService,
      dataSource as unknown as DataSource,
    );
  });

  it('fulfils a first-seen paid checkout event inside the dedup transaction', async () => {
    stubConstructEvent(makeEvent('checkout.session.completed'));

    const result = await service.handleWebhookEvent(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ received: true });
    // Insert-on-first-sight and the state change share one transaction:
    // markPaid must run against the same manager that recorded the event.
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT INTO.*processed_stripe_events/is),
      ['evt_123', 'checkout.session.completed'],
    );
    expect(ordersService.markPaid).toHaveBeenCalledWith('order-1', manager);
  });

  it('skips an already-processed (replayed) event without touching the order', async () => {
    manager.query.mockResolvedValue([]); // ON CONFLICT DO NOTHING matched
    stubConstructEvent(makeEvent('checkout.session.completed'));

    const result = await service.handleWebhookEvent(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ received: true });
    expect(ordersService.markPaid).not.toHaveBeenCalled();
    expect(ordersService.cancelAndRestock).not.toHaveBeenCalled();
  });

  it('cancels and restocks on a first-seen expiry event, in the same transaction', async () => {
    stubConstructEvent(makeEvent('checkout.session.expired'));

    await service.handleWebhookEvent(Buffer.from('{}'), 'sig');

    expect(ordersService.cancelAndRestock).toHaveBeenCalledWith(
      'order-1',
      manager,
    );
  });

  it('skips a replayed expiry event (late arrival after manual changes)', async () => {
    manager.query.mockResolvedValue([]);
    stubConstructEvent(makeEvent('checkout.session.expired'));

    await service.handleWebhookEvent(Buffer.from('{}'), 'sig');

    expect(ordersService.cancelAndRestock).not.toHaveBeenCalled();
  });

  it('does NOT fulfil an unpaid completed session (async payment still pending)', async () => {
    // P24/bank-transfer sessions complete before the money is captured; the
    // order must only flip to paid on async_payment_succeeded.
    stubConstructEvent(
      makeEvent('checkout.session.completed', { payment_status: 'unpaid' }),
    );

    const result = await service.handleWebhookEvent(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ received: true });
    // The event is still recorded so a replay of it stays a no-op…
    expect(manager.query).toHaveBeenCalled();
    // …but no order state changes.
    expect(ordersService.markPaid).not.toHaveBeenCalled();
    expect(ordersService.cancelAndRestock).not.toHaveBeenCalled();
  });

  it('fulfils the order when the async payment later succeeds', async () => {
    stubConstructEvent(makeEvent('checkout.session.async_payment_succeeded'));

    await service.handleWebhookEvent(Buffer.from('{}'), 'sig');

    expect(ordersService.markPaid).toHaveBeenCalledWith('order-1', manager);
  });

  it('cancels and restocks when the async payment fails', async () => {
    stubConstructEvent(makeEvent('checkout.session.async_payment_failed'));

    expect(await service.handleWebhookEvent(Buffer.from('{}'), 'sig')).toEqual({
      received: true,
    });
    expect(ordersService.cancelAndRestock).toHaveBeenCalledWith(
      'order-1',
      manager,
    );
    expect(ordersService.markPaid).not.toHaveBeenCalled();
  });

  it('records but otherwise ignores an unhandled event type', async () => {
    stubConstructEvent(makeEvent('payment_intent.succeeded'));

    const result = await service.handleWebhookEvent(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ received: true });
    expect(ordersService.markPaid).not.toHaveBeenCalled();
    expect(ordersService.cancelAndRestock).not.toHaveBeenCalled();
  });

  it('ignores a session without an orderId in its metadata', async () => {
    stubConstructEvent(
      makeEvent('checkout.session.completed', { metadata: {} }),
    );

    await service.handleWebhookEvent(Buffer.from('{}'), 'sig');

    expect(ordersService.markPaid).not.toHaveBeenCalled();
  });

  it('rejects a bad signature before opening a transaction', async () => {
    const svc = service as unknown as {
      stripe: { webhooks: { constructEvent: jest.Mock } };
    };
    svc.stripe = {
      webhooks: {
        constructEvent: jest.fn(() => {
          throw new Error(
            'No signatures found matching the expected signature',
          );
        }),
      },
    };

    await expect(
      service.handleWebhookEvent(Buffer.from('{}'), 'bad-sig'),
    ).rejects.toThrow('No signatures found');
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(ordersService.markPaid).not.toHaveBeenCalled();
  });

  it('propagates a processing failure so the transaction (and event record) rolls back', async () => {
    // If markPaid dies, the thrown error must reach Stripe as a non-2xx so it
    // retries — and the rolled-back INSERT means the retry is a fresh sight.
    ordersService.markPaid.mockRejectedValue(new Error('db connection lost'));
    stubConstructEvent(makeEvent('checkout.session.completed'));

    await expect(
      service.handleWebhookEvent(Buffer.from('{}'), 'sig'),
    ).rejects.toThrow('db connection lost');
  });
});
