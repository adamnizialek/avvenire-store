import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

// DataSource is provided globally by DatabaseModule's TypeOrmModule.forRootAsync,
// so the controller can inject it without importing anything here.
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
