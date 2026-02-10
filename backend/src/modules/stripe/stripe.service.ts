import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class StripeService {
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

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      order.items.map((item) => ({
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(item.price) * 100),
          product_data: {
            name: item.product.name,
            description: item.product.description,
            ...(item.product.images?.length
              ? { images: item.product.images }
              : {}),
          },
        },
        quantity: item.quantity,
      }));

    const session = await this.stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: `${this.configService.get('FRONTEND_URL')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/cart`,
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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        await this.ordersService.updateStatus(orderId, 'completed');
      }
    }

    return { received: true };
  }
}
