import { makeOriginCheck } from './origin-check.middleware';

function run(
  middleware: ReturnType<typeof makeOriginCheck>,
  method: string,
  origin?: string,
) {
  const req = {
    method,
    headers: origin !== undefined ? { origin } : {},
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  middleware(req as never, res as never, next);
  return { res, next };
}

describe('makeOriginCheck (CSRF defense for SameSite=None cookies)', () => {
  const middleware = makeOriginCheck(['https://shop.example']);

  it('blocks a cross-site POST from a browser (foreign Origin)', () => {
    const { res, next } = run(middleware, 'POST', 'https://evil.example');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it.each(['PUT', 'PATCH', 'DELETE'])('blocks foreign-origin %s too', (m) => {
    const { next } = run(middleware, m, 'https://evil.example');
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a POST from the allowlisted frontend', () => {
    const { next } = run(middleware, 'POST', 'https://shop.example');
    expect(next).toHaveBeenCalled();
  });

  it('allows non-browser POSTs with no Origin header (Stripe webhooks, curl)', () => {
    const { next } = run(middleware, 'POST');
    expect(next).toHaveBeenCalled();
  });

  it('never blocks safe methods (GET has no CSRF side effects)', () => {
    const { next } = run(middleware, 'GET', 'https://evil.example');
    expect(next).toHaveBeenCalled();
  });
});
