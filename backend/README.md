# AVVENIRE backend

NestJS + TypeORM + PostgreSQL API for the AVVENIRE store. Payments via Stripe
Checkout, images via Cloudinary, transactional mail via Resend.

## Local development

```bash
npm install
cp .env.example .env        # fill in secrets
docker compose up -d        # local Postgres on 127.0.0.1:5432
npm run migration:run       # create/upgrade the schema
npm run start:dev
```

The API listens on `http://localhost:3000/api`.

## Database migrations

The schema is managed by TypeORM migrations in `src/migrations/`. In
production (`NODE_ENV=production`):

- `DB_SYNCHRONIZE` is **ignored** — auto-sync can `ALTER`/`DROP` live columns
  and is hard-disabled in `src/modules/database/typeorm-options.ts`.
- Pending migrations run **automatically at boot**, before the app serves
  traffic. Set `DB_MIGRATIONS_RUN=false` to opt out and run them manually.

So deploying to Render is just: merge → build → boot; the release applies its
own migrations. No release command needed.

### Changing the schema

1. Edit the entity files.
2. Generate a migration from the diff (needs a DB that matches the *current*
   schema, e.g. your local dev DB):

   ```bash
   npm run migration:generate -- src/migrations/DescriptiveName
   ```

3. **Review the generated SQL** — especially anything that drops or alters
   columns holding data.
4. Apply and test locally:

   ```bash
   npm run migration:run
   npm run migration:show     # list applied / pending
   npm run migration:revert   # roll back the last one (test your down()!)
   ```

5. Commit the migration file together with the entity change.

All migration commands read the same `DB_*` env vars as the app (from `.env`
via `src/data-source.ts`), so you can target any database:

```bash
DB_HOST=... DB_NAME=... npm run migration:run
```

### Baseline note

The production DB was originally created by `DB_SYNCHRONIZE`. The baseline
migration (`1788088720761-Baseline.ts`) is therefore fully idempotent
(`IF NOT EXISTS` guards): on the existing production schema it no-ops and
just records itself; on a fresh database it creates the whole schema. Fresh
environments need nothing special — `npm run migration:run` builds everything.

### Restoring into a fresh database

1. Create an empty database.
2. Point `DB_*` at it and run `npm run migration:run` (or just boot the app in
   production mode — migrations run at boot).
3. Restore data with `pg_restore` / `psql` from your backup. Restoring data
   only (`--data-only`) on top of the migrated schema avoids clobbering the
   `migrations` bookkeeping table; if you restore schema+data instead, the
   dump already contains the `migrations` table, so subsequent deploys
   continue where the backup left off.

## Tests

```bash
npm test          # unit tests (jest, *.spec.ts colocated in src/)
npm run test:e2e  # e2e tests (see below)
```

The e2e suite needs no Docker or local Postgres: `test/run-e2e.mjs` boots a
throwaway [embedded Postgres](https://www.npmjs.com/package/embedded-postgres),
applies the real migrations to it, runs the suite ([test/checkout.e2e-spec.ts](./test/checkout.e2e-spec.ts):
register → order → checkout session → signed Stripe webhook → paid), and tears
it all down. Only the outbound Stripe API is stubbed — webhook signature
verification is the real thing. CI runs both suites on every push.

## Observability

- **Health check:** `GET /api/health` returns `{"status":"ok","info":{"database":"up"}}`
  (200) and runs a `SELECT 1`, so it fails with 503 when Postgres is
  unreachable. It's public and throttle-exempt — point the external uptime
  monitor at it.
- **Structured logging:** all logs are JSON via [`nestjs-pino`](https://github.com/iamolegga/nestjs-pino).
  In production they're single-line JSON on stdout (captured by the host); in
  dev they're pretty-printed. The `Authorization` header, request `Cookie`, and
  `Set-Cookie` response header are stripped from logs. Health-check polling is
  not logged. Set `LOG_LEVEL` to override the default (`info` in prod, `debug`
  otherwise).
- **Error tracking:** [`@sentry/nestjs`](https://docs.sentry.io/platforms/javascript/guides/nestjs/)
  is initialised in [src/instrument.ts](./src/instrument.ts) and only sends when
  `SENTRY_DSN` is set (no-op locally and in CI). The global
  [`AllExceptionsFilter`](./src/common/all-exceptions.filter.ts) reports 5xx and
  non-HTTP exceptions with request context (path, method, `orderId`); 4xx client
  errors are not reported.

### Deploy-time setup (needs account access)

1. Create a Sentry project (free Developer tier) and set `SENTRY_DSN` on Render.
   Optionally set `SENTRY_TRACES_SAMPLE_RATE` (default `0`).
2. Add a Sentry alert rule (e.g. "a new issue is created") to email/Slack on
   new errors.
3. Add an external uptime monitor (e.g. BetterStack free) hitting
   `https://<api-host>/api/health` every 1–3 min, alerting on non-200.

## Database backups & restore

A nightly GitHub Actions workflow
([db-backup.yml](../.github/workflows/db-backup.yml)) takes a `pg_dump` of
the Neon database, **encrypts it with GPG (AES-256)** — the repo is public
and artifacts on public repos are downloadable by anyone with a GitHub
account — proves the dump restores by replaying it into a throwaway Postgres
inside the same run, and uploads the encrypted file as a workflow artifact
kept for 30 days. Every night is a tested restore, not an assumed one.

It needs two repository secrets (Settings → Secrets and variables → Actions):

- `NEON_DATABASE_URL` — the connection string from the Neon console.
- `BACKUP_PASSPHRASE` — the encryption passphrase. **Keep a copy in a
  password manager**: losing it makes every backup unreadable. Until both
  secrets exist the workflow fails loudly — a red run always means no backup
  was taken.

### Restoring a backup

1. Download the artifact from the workflow run (Actions → Nightly database
   backup → the run → Artifacts) and unzip it to get `backup-<date>.dump.gpg`.
2. Decrypt and restore (needs `postgresql-client` 17+ and `gpg`):

   ```bash
   export BACKUP_PASSPHRASE='<from the password manager>'
   bash scripts/db-backup.sh decrypt backup-<date>.dump.gpg backup.dump
   bash scripts/db-backup.sh restore "postgresql://<target-connection-string>" backup.dump
   bash scripts/db-backup.sh verify "postgresql://<target-connection-string>"
   ```

   The restore uses `--clean --if-exists`, so pointing it at an existing
   database **replaces** that database's contents with the backup.

The whole procedure can be rehearsed any time without production secrets:
run the "DB backup restore drill" workflow
([db-restore-drill.yml](../.github/workflows/db-restore-drill.yml)) from the
Actions tab — it builds a throwaway database with the real migrations, seeds
it, and runs the identical dump → encrypt → decrypt → restore → verify chain,
asserting the data survives byte-for-byte.

## Environment variables

See [.env.example](./.env.example) — it documents every variable the app
reads, including the SSL, migration, logging, and Sentry toggles.
