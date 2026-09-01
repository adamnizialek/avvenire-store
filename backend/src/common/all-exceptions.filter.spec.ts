import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { AllExceptionsFilter, extractOrderId } from './all-exceptions.filter';

jest.mock('@sentry/nestjs', () => ({
  withScope: jest.fn(),
  captureException: jest.fn(),
}));

interface FakeScope {
  setTag: jest.Mock;
  setContext: jest.Mock;
}

function runScope(): FakeScope {
  const scope: FakeScope = { setTag: jest.fn(), setContext: jest.fn() };
  (Sentry.withScope as jest.Mock).mockImplementation(
    (cb: (s: FakeScope) => void) => cb(scope),
  );
  return scope;
}

function hostFor(request: Partial<Record<string, unknown>>) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/api/x', method: 'POST', ...request }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('extractOrderId', () => {
  it('reads orderId from the body', () => {
    expect(
      extractOrderId({ body: { orderId: 'ord_1' }, params: {} } as never),
    ).toBe('ord_1');
  });

  it('reads orderId from route params', () => {
    expect(
      extractOrderId({ body: {}, params: { orderId: 'ord_2' } } as never),
    ).toBe('ord_2');
  });

  it('is undefined when absent or non-string', () => {
    expect(extractOrderId({ body: {}, params: {} } as never)).toBeUndefined();
    expect(
      extractOrderId({ body: { orderId: 42 }, params: {} } as never),
    ).toBeUndefined();
  });
});

describe('AllExceptionsFilter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('captures a 500 to Sentry tagged with the orderId and responds 500', () => {
    const scope = runScope();
    const filter = new AllExceptionsFilter();
    const { host, status, json } = hostFor({
      url: '/api/stripe/create-checkout-session',
      body: { orderId: 'ord_99' },
    });

    filter.catch(new InternalServerErrorException('boom'), host);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(scope.setTag).toHaveBeenCalledWith('orderId', 'ord_99');
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalled();
  });

  it('captures non-HTTP exceptions as 500', () => {
    runScope();
    const filter = new AllExceptionsFilter();
    const { host, status } = hostFor({ body: {} });

    filter.catch(new Error('unexpected'), host);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('does NOT report 4xx client errors to Sentry but still responds', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = hostFor({ body: {} });

    filter.catch(new BadRequestException('bad input'), host);

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'bad input' }),
    );
  });

  it('preserves the original HttpException response body', () => {
    const filter = new AllExceptionsFilter();
    const { host, json } = hostFor({ body: {} });

    filter.catch(
      new HttpException(
        { statusCode: 418, message: 'teapot', foo: 'bar' },
        418,
      ),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'teapot', foo: 'bar' }),
    );
  });
});
