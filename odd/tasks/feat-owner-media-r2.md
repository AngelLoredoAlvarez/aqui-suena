# Feature: Owner media on R2

Objective: define the R2 key layout, ownership rules and lifecycle for owner
uploads before the owner-portal media UI is built. The current implementation
(one flat key per owner) works for the API round trip but does not model
business ownership, readable URLs, retention or orphan cleanup.

Branch: `feat/owner-media-r2-t1` (T1; T2+ pending)
Status: T1 implemented and verified locally; no commit yet
Test runner: `pnpm --filter @aqui-suena/api test`; `pnpm --filter @aqui-suena/db test`

## Current state

- Key layout: `{kind}/{accountId}/{uuid}` (for example `product-photo/acc_123/9f2c...`).
- `media` row: `ownerId`, `businessId` (nullable), `kind`, `r2Key` (unique),
  `mime`, `size`, `createdAt`; `businessId` was added by T1 with no backfill, so
  existing rows stay unscoped.
- `media.confirm` requires the key to start with `<kind>/<accountId>/`.
- `photos.url` and `flyers.url` accept arbitrary client URLs; nothing links a listing row to a `media` row.
- The bucket is private. There is no signed read endpoint; `confirm` returns only the key.
- Presigned PUT lives 300 seconds and signs `host` only with an unsigned payload, so the PUT body type and size are not constrained by the signature.
- `R2ObjectStorage.head` performs a signed `GET` and ignores the body.
- CFDI documents use their own `cfdi/{accountId}/...` prefix.

## Specs

- **S1 — Key grammar.** Every owner upload uses
  `media/v1/{accountId}/{scope}/{kind}/{uuid}.{ext}`. `scope` is
  `businesses/{businessId}` for business media or `account` for account-level
  media. `kind` is one of `product-photo`, `flyer`, `spot-audio`, `avatar`.
  `ext` derives from the validated content type (`jpg`, `png`, `webp`, `mp3`).
- **S2 — Server-generated keys.** The client sends `businessId` (except for
  account media), `kind`, `contentType` and `size`; the server validates plan
  entitlement and business ownership before signing, and `confirm` revalidates
  the full prefix, the business ownership, the kind segment and the real object
  metadata. A client never chooses a key.
- **S3 — Idempotent confirm.** `media.r2Key` is unique. Confirming the same
  object twice returns the existing row instead of creating a duplicate.
- **S4 — Immutable keys.** Every upload writes a new UUID key and never
  overwrites one. Replacing a photo, flyer or avatar writes a new object,
  updates D1 and then deletes the old object. Content-addressed keys and
  deduplication are explicitly out of scope for V1 (see Decisions).
- **S5 — D1 is the source of truth.** Ownership, links and quotas live in D1.
  R2 prefixes are an operational grouping, never an authorization mechanism.
  `media` gains a nullable `businessId`; quotas count by `businessId` + `kind`.
- **S6 — Deletion and retention.** Account deletion purges media rows and
  objects as it does today, with the account prefix as a fail-safe. Business
  deletion and the 90-day retention purge delete objects before rows, without an
  R2-key-destroying cascade. Uploads that never reach `confirm` are swept by
  age.
- **S7 — Serving.** The bucket stays private. A signed read endpoint authorizes
  per kind: owner-only for avatars, readable for media attached to a published
  listing. Keys are immutable, so responses can cache aggressively. A public
  custom domain or Worker proxy is a later decision.
- **S8 — Migration.** Existing `{kind}/{accountId}/{uuid}` keys remain valid:
  `media.r2Key` stores the absolute key, so reads and deletes need no rewrite.
  New uploads use `media/v1/...`. No bulk object move is required.

## Key grammar

```text
media/v1/{accountId}/businesses/{businessId}/{kind}/{uuid}.{ext}
media/v1/{accountId}/account/{kind}/{uuid}.{ext}
```

Examples:

```text
media/v1/acc_123/businesses/biz_456/product-photo/9f2c...e1.webp
media/v1/acc_123/businesses/biz_456/flyer/1a7d...c9.jpg
media/v1/acc_123/businesses/biz_456/spot-audio/7d3e...b2.mp3
media/v1/acc_123/account/avatar/3c8f...a4.png
```

Order rationale:

- Account first: one prefix per tenant, so account-wide purge or listing is a
  single prefix operation.
- Business second: the owner portal is multi-business; one prefix per business
  enables per-business galleries, deletion and the 90-day retention purge.
- Kind third: separates image and audio operations and leaves room for
  per-prefix lifecycle or cache rules.
- `v1` is the **key-layout generation**, not the API, file or schema version.
  It lets a future layout coexist without moving existing objects. The
  application never parses it at runtime because `media.r2Key` is absolute.

## Decisions

- **UUID, not content-addressed.** The client uploads directly to R2, so the
  server cannot verify a content hash without downloading the object; dedup
  would also require reference counting for deletes and complicates per-plan
  quotas. Unique immutable UUID keys give the same cache benefit without that
  fragility.
- **`v1` prefix.** The layout is changing now (business scope, extension), so
  the new generation is marked explicitly. A future `v2` can be migrated by
  prefix; a rollback keeps `v1` objects readable by their stored keys.
- **Explicit `account` scope.** Avoids collisions with business ids and makes
  account-level media (avatars) explicit.
- **CFDI stays outside `media/`.** Fiscal archives keep their own prefix and
  lifecycle.

## Data model changes

- `media.businessId` nullable, references `businesses.id`. No `ON DELETE
  CASCADE`: the object would be orphaned when the row disappears. Delete the
  object and the row explicitly before deleting the business.
- Unique index on `media.r2Key` for idempotent confirm.
- Link `photos` and `flyers` to media (preferred: `mediaId`; acceptable:
  store the key) instead of accepting arbitrary URLs. The current `v.url()`
  contract has to change.
- Optional: `media.status` (`pending`/`confirmed`/`attached`) and an
  `attachedAt` timestamp if orphan sweeps need more than age.

## Read and serving

- Add `media.signedUrl(id)` (or an equivalent read contract) with per-kind
  authorization. `confirm` returning only a key is not usable by the owner UI.
- Cache: immutable keys, long TTL for public listing media, owner-only media
  stays private.
- Public custom domain vs Worker proxy remains open; do not block the key
  layout on it.

## Lifecycle and deletion

- **Orphan uploads:** presign without confirm leaves an R2 object with no D1
  row. Add a periodic sweeper that lists the account or media prefix, compares
  against D1 and deletes unreferenced objects older than 24 hours. A `pending/`
  prefix plus a lifecycle rule is the alternative if the sweeper cost becomes a
  problem.
- **Delete order:** tolerate a 404 when deleting an object, or mark a row as
  deleting before the object delete, so a retry can finish and the row never
  points at a missing object.
- **Account deletion:** keep the current paginated row purge; list the account
  prefix as a fail-safe for orphan objects.
- **Business deletion and retention:** purge media objects and rows for the
  business before deleting the business row; no cascading FK from `media` to
  `businesses`.
- **Plan downgrade:** decide whether excess media is hidden, retained for the
  90-day window or deleted; the owner portal already requires listing affected
  items before a downgrade.

## Open analysis

- **Quotas and concurrency:** count by `businessId` + `kind` at presign; decide
  whether a small concurrent overshoot is acceptable or needs an atomic claim.
- **Byte quota:** per-plan photo counts alone do not cap storage; consider a
  per-account byte budget.
- **CORS:** the bucket needs PUT CORS for the web origins (localhost, Pages,
  Tauri); native clients do not use CORS. Configure and version it.
- **Content validation:** `confirm` compares declared vs stored type; both are
  client-controlled. Decide when to add magic-byte checks, EXIF/GPS stripping
  and real audio-duration validation (the spec says 30 seconds; the code only
  checks 5 MB).
- **Variants:** `srcset`/WebP/AVIF needs a resize service. The `v1` layout does
  not block it; decide later whether variants are separate keys or on-the-fly.
- **Environment buckets:** verify whether staging and production share
  `R2_BUCKET_NAME`; they should not.
- **`head` cost:** switch from a signed GET to a real HEAD to avoid transferring
  the object on metadata checks.
- **Presign hardening:** optionally sign `content-type` and `content-length` so
  R2 rejects wrong-type or oversized PUTs before `confirm`.

## Implementation slices

| Id  | Slice                                                                   | Depends on | Status |
| --- | ----------------------------------------------------------------------- | ---------- | ------ |
| T1  | `media.businessId` + unique `r2Key` + migration                         | —          | done   |
| T2  | Key builder and `presignUpload`/`confirm` on `media/v1/...`             | T1         | next   |
| T3  | Business ownership and plan entitlement checks at presign/confirm       | T1, T2     |        |
| T4  | `media.signedUrl` with per-kind read authorization                      | T1         |        |
| T5  | Deletion, retention and orphan sweep                                    | T1         |        |
| T6  | Link `photos`/`flyers` to media instead of arbitrary URLs               | T1         |        |
| T7  | CORS, magic bytes, EXIF and audio duration hardening                    | T4, T6     |        |
| T8  | Staging round trip: presign, PUT, confirm, read, replace, delete, purge | T2–T6      |        |

## Log

- 2026-11-20: design session. Current flat layout reviewed against the owner
  portal needs. Decided on the `media/v1/{accountId}/{scope}/{kind}/{uuid}.{ext}`
  grammar, UUID immutability, business scope and the `v1` generation marker.
  Blockers identified: media-to-listing link, signed read URLs, idempotent
  confirm, deletion/retention and quota enforcement. No code changed.
- 2026-11-20: T1 implemented on `feat/owner-media-r2-t1`. `media.businessId` is
  now a nullable FK to `businesses` with no cascade, and `media.r2Key` carries a
  unique index. Migration `0014_little_shadowcat` is additive:
  `ALTER TABLE media ADD business_id text REFERENCES businesses(id)` plus
  `CREATE UNIQUE INDEX media_r2_key_unique`. RED evidence: three schema tests
  failed (nullable business FK, unique key) and four migration tests failed
  before generation. GREEN: `pnpm --filter @aqui-suena/db test` 31/31.
  `SPEC-media-storage.md` documents the data-model contract. No commit has been
  created yet. Precondition before applying to staging or production: the flat
  layout allowed duplicate `r2_key` rows (`confirm` inserted on every call); the
  unique index fails if any exist, so duplicates must be checked and removed
  manually first. Independent verification: PASS, no blockers; durable
  assertions added for the FK blocking a business delete while a media row
  points at it and for a duplicate pre-state failing without losing rows. Final
  local run: db 32/32. No commit and no push yet.
