import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

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
    entities: [User, Product, Order, OrderItem],
    migrations: [join(__dirname, '../../migrations/*{.ts,.js}')],
    migrationsRun,
    synchronize,
  };
}
