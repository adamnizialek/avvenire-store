import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { OrdersService } from '../orders/orders.service';
import { imageUrls } from '../products/product-image';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private ordersService: OrdersService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY')!,
      { apiVersion: '2026-01-28.clover' },
    );
  }

  async createCheckoutSession(orderId: string, userId: string) {
    const order = await this.ordersService.findByIdForUser(orderId, userId);

    if (order.status !== 'pending') {
      throw new BadRequestException(
        `Order cannot be paid (status: ${order.status})`,
      );
    }

    // Expire any previous open session for this order so it can't be paid twice.
    if (order.stripeSessionId) {
      try {
        await this.stripe.checkout.sessions.expire(order.stripeSessionId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Could not expire previous session ${order.stripeSessionId}: ${message}`,
        );
      }
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      order.items.map((item) => ({
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(item.price) * 100),
          product_data: {
            name: item.product.name,
            description: item.product.description,
            ...(imageUrls(item.product.images).length
              ? { images: imageUrls(item.product.images) }
              : {}),
          },
        },
        quantity: item.quantity,
      }));

    const session = await this.stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      shipping_address_collection: {
        allowed_countries: [
          'PL',
          'DE',
          'US',
          'GB',
          'FR',
          'IT',
          'ES',
          'NL',
          'CZ',
          'SK',
          'AT',
          'SE',
        ],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'usd' },
            display_name: 'Free Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 10 },
            },
          },
        },
      ],
      success_url: `${this.configService.get('FRONTEND_URL')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/cart`,
      // Stripe requires expires_at between 30 minutes and 24 hours from now.
      // After expiry, the `checkout.session.expired` webhook restocks the order.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      metadata: {
        orderId: orderId,
      },
    });

    await this.ordersService.setStripeSessionId(orderId, session.id);

    return { sessionId: session.id, url: session.url };
  }

  async handleWebhookEvent(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    )!;

    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    switch (event.type) {
      case 'checkout.session.completed':
        // For async methods (e.g. P24/bank transfer) the session can complete
        // while still unpaid — only fulfil once payment is actually captured.
        if (orderId && session.payment_status === 'paid') {
          await this.ordersService.markPaid(orderId);
        }
        break;

      case 'checkout.session.async_payment_succeeded':
        if (orderId) {
          await this.ordersService.markPaid(orderId);
        }
        break;

      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired':
        if (orderId) {
          await this.ordersService.cancelAndRestock(orderId);
        }
        break;

      default:
        break;
    }

    return { received: true };
  }
}
