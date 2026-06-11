import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('DB_HOST') || 'localhost';
        const useSsl = config.get<string>('DB_SSL') === 'true';
        // Verify the server certificate by default; only disable when the
        // provider's CA is genuinely unavailable (set DB_SSL_REJECT_UNAUTHORIZED=false).
        const rejectUnauthorized =
          config.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false';
        return {
          type: 'postgres',
          host: host,
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'postgres'),
          database: config.get<string>('DB_NAME', 'shop'),
          ssl: useSsl ? { rejectUnauthorized } : false,
          entities: [User, Product, Order, OrderItem],
          // Opt-in only. Auto-sync can ALTER/DROP production columns, so it must
          // never default to on. Set DB_SYNCHRONIZE=true to apply schema changes
          // (e.g. on a deploy), then turn it back off. Prefer migrations.
          synchronize: config.get<string>('DB_SYNCHRONIZE') === 'true',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
