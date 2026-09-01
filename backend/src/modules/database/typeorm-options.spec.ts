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

  describe('connection pool', () => {
    it('bounds the pool explicitly and fails fast on exhaustion', () => {
      const options = buildTypeOrmOptions(makeConfig({}));
      expect(options.extra).toEqual({
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
        keepAlive: true,
      });
    });

    it('lets DB_POOL_MAX resize the pool for a different DB plan', () => {
      const options = buildTypeOrmOptions(makeConfig({ DB_POOL_MAX: '25' }));
      // Parsed to a real number — env vars arrive as strings.
      expect((options.extra as { max: number }).max).toBe(25);
    });

    it('falls back to the default on an unparsable DB_POOL_MAX', () => {
      const options = buildTypeOrmOptions(
        makeConfig({ DB_POOL_MAX: 'not-a-number' }),
      );
      expect((options.extra as { max: number }).max).toBe(10);
    });
  });
});
