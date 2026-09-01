import * as Sentry from '@sentry/nestjs';

// Sentry must be initialised before any other module is imported so its
// auto-instrumentation can patch them. main.ts imports this file first.
//
// With no SENTRY_DSN set (local dev, tests, CI) init is skipped entirely and
// every Sentry call becomes a no-op — nothing is sent and nothing breaks.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Opt-in performance tracing; defaults to off so the free tier isn't
    // burned on spans. Set SENTRY_TRACES_SAMPLE_RATE=0.1 to sample 10%.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    // We attach request context ourselves in AllExceptionsFilter and never
    // want cookies/bodies (which carry the auth token) shipped to Sentry.
    sendDefaultPii: false,
  });
}
