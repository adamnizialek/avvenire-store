import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Request,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import * as bcrypt from 'bcrypt';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AUTH_COOKIE, authCookieOptions } from '../auth/auth-cookie';
import { OrdersService } from '../orders/orders.service';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UsersService } from './users.service';

// Same strict limit as the auth endpoints: the delete endpoint verifies a
// password, so it must not be usable as a brute-force oracle.
const SENSITIVE_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

/**
 * GDPR/RODO self-service endpoints (both behind the global JWT guard).
 * The Privacy Policy points here; email remains the manual fallback.
 */
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private ordersService: OrdersService,
    private configService: ConfigService,
  ) {}

  /**
   * Right of access / portability (GDPR Art. 15 & 20): every piece of
   * personal data we hold on the requesting account, as portable JSON.
   */
  @Get('me/export')
  async exportData(@Request() req: AuthenticatedRequest) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    const orders = await this.ordersService.findByUserId(user.id);

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          product: item.product?.name ?? null,
          quantity: item.quantity,
          size: item.size,
          price: item.price,
        })),
      })),
    };
  }

  /**
   * Right to erasure (GDPR Art. 17): anonymizes the account in place. Order
   * rows are retained (tax/accounting obligation, per the Privacy Policy) but
   * lose their link to any identifiable person.
   */
  @Throttle(SENSITIVE_THROTTLE)
  @Delete('me')
  async deleteAccount(
    @Request() req: AuthenticatedRequest,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.usersService.findByIdWithAuth(req.user.userId);
    // 403, not 401: the session itself is valid, only the confirmation
    // failed. (The frontend treats a 401 while logged in as session expiry
    // and would silently log the user out over a typo.)
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new ForbiddenException('Password is incorrect');
    }

    await this.usersService.anonymize(user.id);

    // The tokenVersion bump already revoked the JWT; also drop the cookie so
    // the browser doesn't keep sending a dead token.
    const options = authCookieOptions(this.configService);
    delete options.maxAge;
    res.clearCookie(AUTH_COOKIE, options);

    return {
      message:
        'Your account has been deleted. Order records are kept in anonymized form for the legally required retention period.',
    };
  }
}
