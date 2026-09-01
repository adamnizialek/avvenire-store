import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { ProcessedStripeEvent } from '../stripe/entities/processed-stripe-event.entity';

export type AppTypeOrmOptions = TypeOrmModuleOptions &
  PostgresConnectionOptions;

export function buildTypeOrmOptions(config: ConfigService): AppTypeOrmOptions {
  const host = config.get<string>('DB_HOST') || 'localhost';
  const useSsl = config.get<string>('DB_SSL') === 'true';
  // Verify the server certificate by default; only disable when the
  // provider's CA is genuinely unavailable (set DB_SSL_REJECT_UNAUTHORIZED=false).
  const rejectUnauthorized =
    config.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false';
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  // In production the schema is managed exclusively by migrations:
  // synchronize is hard-off (auto-sync can ALTER/DROP live columns), and
  // pending migrations run at boot before the app serves traffic
  // (opt out with DB_MIGRATIONS_RUN=false to run them manually instead).
  const synchronize =
    !isProduction && config.get<string>('DB_SYNCHRONIZE') === 'true';
  const migrationsRun = isProduction
    ? config.get<string>('DB_MIGRATIONS_RUN') !== 'false'
    : config.get<string>('DB_MIGRATIONS_RUN') === 'true';

  return {
    type: 'postgres',
    host: host,
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USERNAME', 'postgres'),
    password: config.get<string>('DB_PASSWORD', 'postgres'),
    database: config.get<string>('DB_NAME', 'shop'),
    ssl: useSsl ? { rejectUnauthorized } : false,
    entities: [User, Product, Order, OrderItem, ProcessedStripeEvent],
    migrations: [join(__dirname, '../../migrations/*{.ts,.js}')],
    migrationsRun,
    synchronize,
    // Explicit node-postgres pool sizing (issue #3). One always-on Render
    // instance against Neon: 10 pooled connections fit comfortably inside
    // Neon's per-compute connection limit (112 even on the smallest compute)
    // while covering checkout bursts — the row locks in order creation hold
    // connections for whole transactions. Idle connections are released
    // after 30s so a quiet shop lets Neon's compute scale to zero, and
    // connectionTimeoutMillis turns pool exhaustion into a fast, visible
    // error instead of requests hanging forever.
    extra: {
      // Env vars arrive as strings — parse, and fall back on anything unset
      // or unparsable rather than handing pg a NaN pool size.
      max: parseInt(config.get<string>('DB_POOL_MAX', ''), 10) || 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // Detect connections silently dropped by Neon compute suspend/resume
      // instead of failing the first query after a pause.
      keepAlive: true,
    },
  };
}
