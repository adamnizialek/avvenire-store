/**
 * E2E test runner: boots a throwaway embedded Postgres, applies the real
 * migrations to it, then runs the e2e jest suite against it and tears
 * everything down. No Docker or local Postgres needed — `npm run test:e2e`
 * works the same on a dev machine and in CI.
 *
 * This lives outside jest because `embedded-postgres` is pure ESM and the
 * jest suite is CommonJS (ts-jest); the spec only sees plain DB_* env vars.
 */
import EmbeddedPostgres from 'embedded-postgres';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = dirname(dirname(fileURLToPath(import.meta.url)));
// Off the default 5432 so a local dev Postgres is never touched; offset by
// pid so two concurrent runs don't collide.
const port = 54_000 + (process.pid % 1000);
const dataDir = mkdtempSync(join(tmpdir(), 'avvenire-e2e-pg-'));

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port,
  persistent: false,
});

const env = {
  ...process.env,
  NODE_ENV: 'test',
  E2E_BOOTSTRAPPED: '1',
  DB_HOST: '127.0.0.1',
  DB_PORT: String(port),
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_NAME: 'shop_e2e',
  DB_SSL: 'false',
  DB_SYNCHRONIZE: 'false',
  DB_MIGRATIONS_RUN: 'false',
  JWT_SECRET: 'e2e-test-secret',
  STRIPE_SECRET_KEY: 'sk_test_e2e_dummy',
  STRIPE_WEBHOOK_SECRET: 'whsec_e2e_test_secret',
  // The Resend SDK throws at construction without a key, which would crash
  // module init. Nothing in the e2e suite sends mail.
  RESEND_API_KEY: 're_e2e_dummy',
  FRONTEND_URL: 'http://localhost:5173',
  LOG_LEVEL: 'silent',
};

function run(title, args) {
  console.log(`\n[e2e] ${title}`);
  const result = spawnSync(process.execPath, args, {
    cwd: backendDir,
    env,
    stdio: 'inherit',
  });
  return result.status ?? 1;
}

let exitCode = 1;
try {
  console.log(`[e2e] starting embedded Postgres on :${port} (${dataDir})`);
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('shop_e2e');

  // The schema comes from the real migrations — the same path production
  // boots through — so the e2e run also proves they build a fresh DB.
  exitCode = run('applying migrations', [
    join(backendDir, 'node_modules/typeorm/cli-ts-node-commonjs.js'),
    '-d',
    'src/data-source.ts',
    'migration:run',
  ]);

  if (exitCode === 0) {
    exitCode = run('running e2e suite', [
      join(backendDir, 'node_modules/jest/bin/jest.js'),
      '--config',
      './test/jest-e2e.json',
      '--runInBand',
      ...process.argv.slice(2),
    ]);
  }
} finally {
  await pg.stop().catch(() => {});
  rmSync(dataDir, { recursive: true, force: true });
}
process.exit(exitCode);
