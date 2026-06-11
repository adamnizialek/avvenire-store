import {
  Controller,
  Post,
  Body,
  Request,
  Headers,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { StripeService } from './stripe.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(private stripeService: StripeService) {}

  @Post('create-checkout-session')
  createCheckoutSession(@Body('orderId') orderId: string, @Request() req: any) {
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
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Webhook verification failed: ${message}`);
      throw new BadRequestException('Invalid webhook signature');
    }
  }
}
