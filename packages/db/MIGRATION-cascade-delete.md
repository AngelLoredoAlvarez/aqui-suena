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

The schema change is committed and unit-tested, and it was applied to **staging**
(`aqui-suena-db-staging`) on 2026-11-10. Production has **not** been migrated.
Any production push still requires explicit user authorization.

## Pre-flight (read-only, run before asking for authorization)

Staging database: `aqui-suena-db-staging` (binding `aqui_suena_db`, env
`staging`). Adjust the name if the target is production.

### Captured pre-flight for staging (2026-11-10)

- Bookmark: `00000003-00000000-0000511f-645337dff4553569aad3e9c701d07d55`
- Row counts: every directory table was empty (`businesses`, `services`,
  `work_entries`, `products`, `photos`, `flyers`, `hours` = 0).
- Foreign keys before the migration: all reported `NO ACTION`.
- D1 rejects a seven-term `UNION ALL` with `SQLITE_ERROR 7500 (too many terms
  in compound SELECT)`; use scalar subqueries in one `SELECT` for the counts.

```bash
# 1. Capture the current time-travel bookmark (rollback point).
cd packages/api
npx wrangler d1 time-travel info aqui-suena-db-staging --env staging

# 2. Count rows before the migration, including every child table. D1 rejects
#    a seven-term UNION ALL; use scalar subqueries in one SELECT.
npx wrangler d1 execute aqui-suena-db-staging --env staging --remote --command "
  SELECT
    (SELECT COUNT(*) FROM businesses) AS businesses,
    (SELECT COUNT(*) FROM services) AS services,
    (SELECT COUNT(*) FROM work_entries) AS work_entries,
    (SELECT COUNT(*) FROM products) AS products,
    (SELECT COUNT(*) FROM photos) AS photos,
    (SELECT COUNT(*) FROM flyers) AS flyers,
    (SELECT COUNT(*) FROM hours) AS hours"
```

Record the bookmark and the row counts in the approval request. Push is only
allowed after the user approves that exact bookmark and target.

## Apply (requires explicit authorization)

`drizzle-kit` reads the D1 HTTP credentials from the environment. In this repo
the staging values live in Infisical, so the applied command was:

```bash
pnpm exec infisical run --env=staging --silent -- \
  pnpm --filter @aqui-suena/db db:push --force
```

`--force` skips the interactive confirmation. To review the statements without
applying anything, run the same command with `--verbose --strict` in a
non-interactive shell: it prints the SQL and then exits for lack of a TTY.

SQLite cannot alter a foreign key in place; Drizzle rebuilds the child tables
with `__new_*` + `INSERT ... SELECT` + `DROP` + `RENAME`.

## Applied record (staging, 2026-11-10)

- Push output: `Changes applied`.
- Row counts after: every table still `0` (no data loss; staging was empty).
- Foreign keys after: all eight report `CASCADE`.
- `flyers_business_id_unique` still exists.
- Post-migration bookmark:
  `00000004-00000029-0000511f-ba7629014aef59ac74603087435aaa3c`
- Incident: the first push recreated `flyers` and then failed with
  `index flyers_business_id_unique already exists` because Drizzle emitted the
  index creation twice. The database kept the partial `flyers` change; a second
  push detected it as already applied and finished the remaining five tables.

## Post-check

```bash
# Row counts must match the pre-flight (no data loss).
npx wrangler d1 execute aqui-suena-db-staging --env staging --remote --command "
  SELECT
    (SELECT COUNT(*) FROM businesses) AS businesses,
    (SELECT COUNT(*) FROM services) AS services,
    (SELECT COUNT(*) FROM work_entries) AS work_entries,
    (SELECT COUNT(*) FROM products) AS products,
    (SELECT COUNT(*) FROM photos) AS photos,
    (SELECT COUNT(*) FROM flyers) AS flyers,
    (SELECT COUNT(*) FROM hours) AS hours"

# Verify every foreign key reports CASCADE.
npx wrangler d1 execute aqui-suena-db-staging --env staging --remote --command "
  SELECT
    (SELECT group_concat(\"table\" || '.' || \"from\" || '->' || on_delete)
       FROM pragma_foreign_key_list('flyers')) AS flyers,
    (SELECT group_concat(\"table\" || '.' || \"from\" || '->' || on_delete)
       FROM pragma_foreign_key_list('hours')) AS hours,
    (SELECT group_concat(\"table\" || '.' || \"from\" || '->' || on_delete)
       FROM pragma_foreign_key_list('photos')) AS photos,
    (SELECT group_concat(\"table\" || '.' || \"from\" || '->' || on_delete)
       FROM pragma_foreign_key_list('products')) AS products,
    (SELECT group_concat(\"table\" || '.' || \"from\" || '->' || on_delete)
       FROM pragma_foreign_key_list('services')) AS services,
    (SELECT group_concat(\"table\" || '.' || \"from\" || '->' || on_delete)
       FROM pragma_foreign_key_list('work_entries')) AS work_entries"

# Capture the new bookmark as evidence.
npx wrangler d1 time-travel info aqui-suena-db-staging --env staging
```

## Rollback

```bash
npx wrangler d1 time-travel restore aqui-suena-db-staging --env staging \
  --bookmark 00000003-00000000-0000511f-645337dff4553569aad3e9c701d07d55
```

Restoring is itself destructive to later writes; confirm with the user before
running it.
