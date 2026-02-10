import {
  Controller,
  Post,
  Body,
  Request,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { StripeService } from './stripe.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('stripe')
export class StripeController {
  constructor(private stripeService: StripeService) {}

  @Post('create-checkout-session')
  createCheckoutSession(
    @Body('orderId') orderId: string,
    @Request() req: any,
  ) {
    return this.stripeService.createCheckoutSession(orderId, req.user.userId);
  }

  @Public()
  @SkipThrottle()
  @Post('webhook')
  async handleWebhook(
    @Request() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    try {
      return await this.stripeService.handleWebhookEvent(
        req.rawBody,
        signature,
      );
    } catch (err) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${err.message}`,
      );
    }
  }
}
