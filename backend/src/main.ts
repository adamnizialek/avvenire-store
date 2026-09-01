// Must be the first import so Sentry can instrument everything below it.
import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { makeOriginCheck } from './common/origin-check.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    // Buffer boot logs until the pino logger is wired in below, then route all
    // Nest logging (including these) through structured JSON.
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  // Strict CSP for an API that serves only JSON and uploaded images: nothing
  // may execute or be embedded. The storefront's own CSP lives with its host
  // (frontend/vercel.json).
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: ["'none'"],
          imgSrc: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  // The auth cookie is SameSite=None in production, so mutations must prove
  // they come from our frontend (or a non-browser client without an Origin).
  // Localhost stays allowed so the Vite dev server can talk to any backend.
  app.use(
    makeOriginCheck([
      frontendUrl,
      'http://localhost:5173',
      'http://localhost:4173',
    ]),
  );

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
