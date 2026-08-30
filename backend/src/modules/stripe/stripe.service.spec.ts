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
    const dataSource = {
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
});
