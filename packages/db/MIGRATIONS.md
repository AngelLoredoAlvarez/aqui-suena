# D1 migrations

The schema lives in `src/schema.ts`; the SQL that reaches D1 lives in
`migrations/`. `wrangler d1 migrations` applies only the pending files and records
each one in the `d1_migrations` table, so the command is idempotent and safe to
re-run.

`drizzle-kit push` is retired. It generated SQL on its own, kept no history and
rewrote tables in place; the `flyers` rebuild during the cascade migration is the
proof.

## Baseline

`migrations/0000_baseline.sql` describes the schema as of 2026-11-16: 14 tables,
including the account fiscal columns and without `invoices`. Both databases
already have that schema, so the baseline is **marked as applied, never executed**.
Until that row exists, `migrations apply` will try to recreate existing tables and
fail.

Run this once per database, replacing `<db>` and the environment flag:

```bash
# Creates the tracking table exactly as wrangler expects it.
pnpm --filter @aqui-suena/api exec wrangler d1 execute <db> --remote --command "
  CREATE TABLE IF NOT EXISTS d1_migrations(
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  );"

# Marks the baseline as applied without running it.
pnpm --filter @aqui-suena/api exec wrangler d1 execute <db> --remote --command "
  INSERT INTO d1_migrations (name) VALUES ('0000_baseline.sql');"

# Confirms the baseline shows as applied and nothing is pending.
pnpm --filter @aqui-suena/api exec wrangler d1 migrations list <db> --remote
```

Use `--env staging` for `aqui-suena-db-staging`; the default environment targets
`aqui-suena-db`.

## Adding a schema change

1. Edit `src/schema.ts`.
2. Generate the migration and commit it with the code:

   ```bash
   pnpm --filter @aqui-suena/db db:generate
   ```

   `migrations/meta/` must stay committed: it is the snapshot `drizzle-kit` diffs
   against, and without it the next run emits a full `CREATE TABLE` script instead
   of an incremental one.
3. Apply it per environment (staging first):

   ```bash
   pnpm --filter @aqui-suena/api exec wrangler d1 migrations apply aqui-suena-db-staging --remote --env staging
   pnpm --filter @aqui-suena/api exec wrangler d1 migrations apply aqui-suena-db --remote
   ```
4. Record the applied bookmark in the feature document.

CI fails when `src/schema.ts` changes without a committed migration (job
"Migration drift" in `quality.yml`).

## Deploy order

Migrate before deploying the Worker. The Worker queries the new columns as soon as
it is live, so a deploy against an unmigrated database is a runtime error, not a
warning.

## Rollback

D1 keeps time travel. Capture the bookmark before applying anything:

```bash
pnpm --filter @aqui-suena/api exec wrangler d1 time-travel info <db> --remote
```

Restoring is destructive to later writes and needs explicit approval.
