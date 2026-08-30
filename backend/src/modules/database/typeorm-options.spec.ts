import { ConfigService } from '@nestjs/config';
import { buildTypeOrmOptions } from './typeorm-options';

/**
 * Minimal stand-in for ConfigService backed by a plain env object. A real
 * ConfigService is not usable here: it lets process.env win over the passed
 * object, so Jest's own NODE_ENV=test would override the scenarios below.
 */
function makeConfig(env: Record<string, string>): ConfigService {
  return {
    get: (key: string, defaultValue?: unknown): unknown =>
      key in env ? env[key] : defaultValue,
  } as unknown as ConfigService;
}

describe('buildTypeOrmOptions', () => {
  describe('in production', () => {
    it('forces synchronize off even when DB_SYNCHRONIZE=true', () => {
      const options = buildTypeOrmOptions(
        makeConfig({ NODE_ENV: 'production', DB_SYNCHRONIZE: 'true' }),
      );
      expect(options.synchronize).toBe(false);
    });

    it('runs pending migrations automatically', () => {
      const options = buildTypeOrmOptions(
        makeConfig({ NODE_ENV: 'production' }),
      );
      expect(options.migrationsRun).toBe(true);
    });

    it('allows opting out of auto-migrations via DB_MIGRATIONS_RUN=false', () => {
      const options = buildTypeOrmOptions(
        makeConfig({ NODE_ENV: 'production', DB_MIGRATIONS_RUN: 'false' }),
      );
      expect(options.migrationsRun).toBe(false);
    });
  });

  describe('outside production', () => {
    it('keeps synchronize opt-in via DB_SYNCHRONIZE', () => {
      expect(buildTypeOrmOptions(makeConfig({})).synchronize).toBe(false);
      expect(
        buildTypeOrmOptions(makeConfig({ DB_SYNCHRONIZE: 'true' })).synchronize,
      ).toBe(true);
    });

    it('does not run migrations automatically unless opted in', () => {
      expect(buildTypeOrmOptions(makeConfig({})).migrationsRun).toBe(false);
      expect(
        buildTypeOrmOptions(makeConfig({ DB_MIGRATIONS_RUN: 'true' }))
          .migrationsRun,
      ).toBe(true);
    });
  });

  it('registers migration files', () => {
    const options = buildTypeOrmOptions(makeConfig({}));
    expect(options.migrations).toBeDefined();
    expect((options.migrations as string[]).length).toBeGreaterThan(0);
  });

  it('verifies the server certificate by default when SSL is enabled', () => {
    const options = buildTypeOrmOptions(makeConfig({ DB_SSL: 'true' }));
    expect(options.ssl).toEqual({ rejectUnauthorized: true });
  });
});
