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
npm test          # unit tests
npm run test:e2e  # e2e tests
```

## Environment variables

See [.env.example](./.env.example) — it documents every variable the app
reads, including the SSL and migration toggles.
