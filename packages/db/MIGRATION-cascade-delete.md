# Migration pre-flight: directory cascade delete

SQLite foreign keys are enforced by D1. Deleting a business used to fail when it
had children because the eight directory foreign keys had no delete action. The
schema now declares `onDelete: "cascade"` on:

- `services.business_id`
- `work_entries.business_id`
- `products.business_id`
- `photos.business_id`
- `photos.work_entry_id`
- `photos.product_id`
- `flyers.business_id`
- `hours.business_id`

`subscriptions` references `accounts`, not `businesses`, so it is intentionally
unchanged.

## Status

The schema change is committed and unit-tested. **It has NOT been pushed to any
D1 database.** Running `drizzle-kit push` against staging or production requires
explicit user authorization first.

## Pre-flight (read-only, run before asking for authorization)

Staging database: `aqui-suena-db-staging` (binding `aqui_suena_db`, env
`staging`). Adjust the name if the target is production.

```bash
# 1. Capture the current time-travel bookmark (rollback point).
cd packages/api
npx wrangler d1 time-travel info aqui-suena-db-staging --env staging

# 2. Count rows before the migration, including every child table.
npx wrangler d1 execute aqui-suena-db-staging --env staging --remote --command "
  SELECT 'businesses' AS table_name, COUNT(*) AS rows FROM businesses
  UNION ALL SELECT 'services', COUNT(*) FROM services
  UNION ALL SELECT 'work_entries', COUNT(*) FROM work_entries
  UNION ALL SELECT 'products', COUNT(*) FROM products
  UNION ALL SELECT 'photos', COUNT(*) FROM photos
  UNION ALL SELECT 'flyers', COUNT(*) FROM flyers
  UNION ALL SELECT 'hours', COUNT(*) FROM hours"
```

Record the bookmark and the row counts in the approval request. Push is only
allowed after the user approves that exact bookmark and target.

## Apply (requires explicit authorization)

`drizzle-kit` reads the D1 HTTP credentials from the environment:

```bash
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_DATABASE_ID=...
export CLOUDFLARE_D1_TOKEN=...
pnpm --filter @aqui-suena/db db:push
```

SQLite cannot alter a foreign key in place; Drizzle may rebuild the child
tables. Review the generated statements in the interactive prompt before
confirming, and keep the pre-flight bookmark.

## Post-check

```bash
# Row counts must match the pre-flight (no data loss).
npx wrangler d1 execute aqui-suena-db-staging --env staging --remote --command "
  SELECT 'businesses' AS table_name, COUNT(*) AS rows FROM businesses
  UNION ALL SELECT 'services', COUNT(*) FROM services
  UNION ALL SELECT 'work_entries', COUNT(*) FROM work_entries
  UNION ALL SELECT 'products', COUNT(*) FROM products
  UNION ALL SELECT 'photos', COUNT(*) FROM photos
  UNION ALL SELECT 'flyers', COUNT(*) FROM flyers
  UNION ALL SELECT 'hours', COUNT(*) FROM hours"

# Capture the new bookmark as evidence.
npx wrangler d1 time-travel info aqui-suena-db-staging --env staging
```

## Rollback

```bash
npx wrangler d1 time-travel restore aqui-suena-db-staging --env staging --bookmark <pre-flight-bookmark>
```

Restoring is itself destructive to later writes; confirm with the user before
running it.
