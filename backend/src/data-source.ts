/**
 * DataSource for the TypeORM CLI (migration:generate / run / revert).
 * The running app builds its own options in modules/database — keep the
 * two in sync by deriving both from buildTypeOrmOptions.
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { buildTypeOrmOptions } from './modules/database/typeorm-options';

const options = buildTypeOrmOptions(new ConfigService(process.env));

export default new DataSource({
  ...options,
  // The CLI must never sync or auto-run; it only does what it's told.
  synchronize: false,
  migrationsRun: false,
});
