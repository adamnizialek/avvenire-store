import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Request, Response } from 'express';

/** Pull an order id off the request so a failed payment/order can be traced. */
export function extractOrderId(request: Request): string | undefined {
  const body = request.body as Record<string, unknown> | undefined;
  const params = request.params as Record<string, unknown> | undefined;
  const candidate = body?.orderId ?? params?.orderId;
  return typeof candidate === 'string' ? candidate : undefined;
}

/**
 * Global exception filter: reports server-side faults to Sentry with request
 * context (path, method, orderId) and returns a consistent JSON error body.
 *
 * Only 5xx and non-HTTP exceptions are captured — 4xx client errors
 * (validation, auth, not-found) are expected traffic and would drown the real
 * faults in noise. The response shape is unchanged from Nest's default filter
 * so clients see the same bodies they always have.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      const orderId = extractOrderId(request);
      Sentry.withScope((scope) => {
        scope.setTag('path', request.url);
        scope.setTag('method', request.method);
        if (orderId) scope.setTag('orderId', orderId);
        scope.setContext('request', {
          url: request.url,
          method: request.method,
          orderId,
        });
        Sentry.captureException(exception);
      });
      this.logger.error(
        `${request.method} ${request.url} -> ${status}` +
          (orderId ? ` (order ${orderId})` : ''),
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: 'Internal server error' };

    response
      .status(status)
      .json(
        typeof body === 'string' ? { statusCode: status, message: body } : body,
      );
  }
}
