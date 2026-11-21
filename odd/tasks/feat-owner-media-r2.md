# Feature: Owner media on R2

Objective: define the R2 key layout, ownership rules and lifecycle for owner
uploads before the owner-portal media UI is built. The current implementation
(one flat key per owner) works for the API round trip but does not model
business ownership, readable URLs, retention or orphan cleanup.

Branch: `main` (T8 is an operational staging round trip; no code branch)
Status: T1–T8 complete; staging round trip 27/27, no commit
Test runner: `pnpm --filter @aqui-suena/api test`; `pnpm --filter @aqui-suena/db test`

## Current state

- Key layout: new uploads use `media/v1/{accountId}/{scope}/{kind}/{uuid}.{ext}`
  (built and parsed by `packages/api/src/domain/media/key.ts`). Legacy
  `{kind}/{accountId}/{uuid}` keys remain valid for reads and deletes, but
  `confirm` accepts only v1 keys.
- `media` row: `ownerId`, `businessId` (nullable), `kind`, `r2Key` (unique),
  `mime`, `size`, `createdAt`; `businessId` is parsed from the key on confirm.
- `media.confirm` parses the v1 key, requires the account/kind/extension to
  match, validates the real object metadata and is idempotent per key. Presign
  and confirm both enforce business ownership and the plan entitlement.
- `photos.media_id` and `flyers.media_id` link listings to media (cascade on
  media delete); legacy `url` stays nullable for pre-T6 rows. Writes require a
  media id validated against owner, business and kind; public reads are signed
  server-side for visible listings.
- The bucket is private. `media.signedUrl` returns a short-lived signed GET for
  the owner of the row; public listing reads await the T6 links.
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
  age. **T5 landing:** `PurgeExpiredBusinesses` runs from the daily cron and the
  admin endpoint; `SweepMediaOrphans` deletes unreferenced `media/` objects older
  than 24 hours; account deletion also lists the new and legacy account prefixes
  as a fail-safe; object deletes tolerate `404`.
- **S7 — Serving.** The bucket stays private. A signed read endpoint authorizes
  per kind: owner-only for avatars, readable for media attached to a published
  listing. Keys are immutable, so responses can cache aggressively. A public
  custom domain or Worker proxy is a later decision. **T4/T6 landing:** the
  signed endpoint stays owner-only; public reads are signed per request inside
  the directory and ads endpoints when the media is attached to a visible
  listing.
- **S8 — Migration.** Existing `{kind}/{accountId}/{uuid}` keys remain valid:
  `media.r2Key` stores the absolute key, so reads and deletes need no rewrite.
  New uploads use `media/v1/...`; `confirm` accepts only v1 keys. No bulk object
  move is required.

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
  It lets a future layout coexist without moving existing objects. Reads and
  deletes always use the stored absolute `media.r2Key`; only `confirm` parses the
  layout, to validate a new upload.

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
- **Media entitlement mapping (T3).** Account avatars are not a business
  entitlement, so every plan can upload them. Every tier includes flyers.
  `product-photo` requires the `full` media tier (paid plans).
  `spot-audio` is exclusive to Comercios & Catálogo (the top, most expensive
  plan) and requires `spotEligible`, which stays off until it launches, so no
  plan can upload audio spots yet. `logo` in the
  `flyer+logo` tier is a directory photo, not a media kind, until T6 links
  listings to media.
- **CFDI stays outside `media/`.** Fiscal archives keep their own prefix and
  lifecycle.
- **EXIF policy (T7).** GPS EXIF is rejected at `confirm` instead of stripped:
  stripping needs an image re-encode, and paid pipelines are excluded by the
  zero-cost rule. Rejecting protects listing location privacy without rewriting
  the immutable object. The upload picker can strip metadata client-side.
- **Zero-cost optimization.** Image work must not add recurring cost: no
  Cloudflare Image Resizing, no Cloudflare Images, no paid thumbnail/transform
  API, no add-on plan. Only client-side compression, free-tier Workers WASM and
  the free R2 allowance are allowed. Variants wait for a free pipeline.

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
- **Variants:** `srcset`/WebP/AVIF needs a derivative pipeline. The `v1` layout
  does not block it; decide later between client-generated thumbnails and a free
  Worker WASM pipeline. Paid image services are excluded by the zero-cost rule.
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
| T2  | Key builder and `presignUpload`/`confirm` on `media/v1/...`             | T1         | done   |
| T3  | Business ownership and plan entitlement checks at presign/confirm       | T1, T2     | done   |
| T4  | `media.signedUrl` with per-kind read authorization                      | T1         | done   |
| T5  | Deletion, retention and orphan sweep                                    | T1         | done   |
| T6  | Link `photos`/`flyers` to media instead of arbitrary URLs               | T1         | done   |
| T7  | CORS, magic bytes, EXIF and audio duration hardening                    | T4, T6     | done   |
| T8  | Staging round trip: presign, PUT, confirm, read, replace, delete, purge | T2–T6      | done   |

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
  local run: db 32/32. Merged as PR #87 (commit `dc206eb`).
- 2026-11-20: T2 implemented on `feat/owner-media-r2-t2`. New module
  `packages/api/src/domain/media/key.ts` builds and parses
  `media/v1/{accountId}/{scope}/{kind}/{uuid}.{ext}` with account scope for
  avatars and business scope for the other kinds. The kind rules moved to
  `media-kind.ts` so `storage.ts` and the key module do not form a cycle;
  `storage.ts` re-exports them. `presignUpload` accepts an optional `businessId`,
  builds the key server-side and both adapters share the builder. `confirm`
  requires a v1 key for the authenticated account and declared kind, requires
  the extension to match the declared content type, persists `businessId` parsed
  from the key and returns the existing row on a repeated confirm (it re-reads
  after a lost insert race). RED evidence: the key module was missing, then 21
  focused API tests failed before the implementation. GREEN: api 1242/1242,
  db 32/32. Legacy flat keys remain readable/deletable but `confirm` rejects
  them. T3 (business ownership and plan entitlement) is the next slice and is
  not implemented: a business id is shape-validated only. Independent
  verification found one blocker before this fix: the parser used the `in`
  operator for kind membership, so `toString`/`constructor`/`__proto__` reached
  the limits lookup and threw `INTERNAL_SERVER_ERROR`. Fixed with
  `Object.hasOwn`, a lowercase-only grammar and regression tests in the parser,
  the router and `validateMediaUpload`. Recheck: PASS, no new blocker; final
  gates api 1242/1242, db 32/32, typecheck 7/7, biome, arch and singletons
  clean. No commit yet. Merged as PR #88 (commit `0edbbda`).
- 2026-11-20: T3 implemented on `feat/owner-media-r2-t3`. Presign and confirm
  now require the business to belong to the authenticated account
  (`assertBusinessOwned`, NOT_FOUND for foreign or missing) and enforce the plan
  media entitlement (`assertCanUploadMedia`, FORBIDDEN
  `UPGRADE_REQUIRED: billing.upgradeRequired.mediaUpload`). The pure rule lives
  in `domain/media/entitlement.ts` and maps the existing tiers: avatars are
  account-level for every plan, flyers for every tier, `product-photo` only for
  the `full` tier, and `spot-audio` exclusive to Comercios & Catálogo only when
  `spotEligible` is on (currently off everywhere). The media router now takes a dependency object with the
  media, business and subscription repositories plus storage. RED evidence: the
  entitlement module was missing and the router suite failed before the new
  dependencies and checks. GREEN: api 1258/1258, db 32/32. Confirmed rows are
  looked up before the plan check, so a repeat confirm still returns the
  existing row after a downgrade while a new confirm is blocked. Independent
  verification: PASS, no blockers; advisories led to stronger tests for a
  foreign-owned business, a hidden business and malformed business ids. No
  commit yet. Merged as PR #89 (commit `36419ec`).
- 2026-11-20: T4 implemented on `feat/owner-media-r2-t4`. `media.signedUrl`
  takes a media id, returns `NOT_FOUND` for a missing row or a foreign owner,
  and otherwise returns a short-lived signed GET built by the storage adapter
  (R2 SigV4 GET; the in-memory adapter returns a fake URL). The bucket stays
  private and no object key is served as a public URL. Scope decision: reads are
  owner-only for every kind because the listing-readable branch needs the T6
  media-to-listing links; enabling it before that would expose unreferenced or
  unpublished objects. RED evidence: the storage port, both adapters and the
  router procedure were missing, and seven focused tests failed first. GREEN:
  api 1267/1267, db 32/32. Independent verification: PASS, no blockers; the
  foreign/missing tests were strengthened to assert the exact NOT_FOUND message
  and the R2 test now proves the signature is a GET, not a PUT. No commit yet.
  Merged as PR #90 (commit `68a95ed`).
- 2026-11-21: T5 implemented on `feat/owner-media-r2-t5`. The storage port gains
  `list(prefix)` (R2 ListObjectsV2 with continuation tokens, in-memory backed by
  stored timestamps) and object deletes tolerate `404`. `SweepMediaOrphans`
  deletes unreferenced `media/` objects older than 24 hours, re-checking the row
  before each delete. `PurgeExpiredBusinesses` lists businesses past
  `retained_until`, purges their media objects and rows, and only then deletes
  the business. The daily cron (`0 3 * * *`) runs both; the admin endpoint runs
  the same purge and answers `{ businesses, media }` or `503` without storage.
  Account deletion now lists the new and legacy account prefixes as a
  best-effort fail-safe. RED evidence: four storage/list tests failed before the
  port and adapters existed; repository tests failed before the new queries and
  the retention services had no modules. GREEN: api 1290/1290, db 32/32.
  Independent verification: PASS, no blockers; advisories led to durable
  admin/cron tests, continuation-token decoding, removing a vacuous assertion
  and documenting that retention does not touch legacy unscoped rows. No commit
  yet. Merged as PR #91 (commit `a541caf`).
- 2026-11-21: T6 implemented on `feat/owner-media-r2-t6`. Migration
  `0015_unique_whiplash` rebuilds `photos` and `flyers` with a nullable
  `media_id` FK to `media` (`ON DELETE CASCADE`), nullable `url`, and a check
  requiring one of the two; the generated copy had to be corrected to write
  `NULL` for the new column. Writes require `mediaId`: it is validated against
  the owner, business and kind (`product-photo` for photos, `flyer` for flyers).
  Public reads resolve media to signed URLs inside the directory and ads
  endpoints when the business is visible; legacy URLs still pass through.
  Replacing or deleting a photo/flyer deletes the old media object and row, and
  updating with the same media id keeps it (a bug found while testing). RED
  evidence: four schema tests failed before the columns existed; the generated
  migration initially read a non-existent `media_id`. Independent verification
  found one blocker: two photos could share one media row, and deleting one
  cascaded the other. Fixed with a one-to-one attach rule (`CONFLICT`) and
  `findByMediaId` on both repositories. A second recheck found the check was
  not atomic: concurrent creates still attached one media to two photos. Fixed
  with unique indexes on `photos.media_id`/`flyers.media_id` (migration
  `0016_tense_hellfire_club`) and a `CONFLICT` mapping in the D1 adapters.
  GREEN: api 1304/1304, db 38/38. No commit yet. Merged as PR #92
  (commit `85eaa9d`).
- 2026-11-21: T7 implemented on `feat/owner-media-r2-t7`. The storage port gains
  `read(key)` (full GET; in-memory adapter stores bodies). `confirm` now reads
  new objects and validates magic bytes for JPEG/PNG/WebP/MP3, rejects JPEGs
  with a GPS EXIF directory and enforces the 30-second MP3 limit by parsing
  frame headers. The EXIF decision: reject GPS metadata rather than strip it,
  because stripping needs an image re-encode (paid pipelines excluded), the upload
  picker can strip client-side. R2 CORS is versioned in
  `packages/api/r2-cors.json` and applied with `wrangler r2 bucket cors set`.
  RED evidence: content tests failed before the module; the MP3 parser initially
  used a signed bitwise sync check that rejected valid frames, caught by tests.
  Independent verification: PASS, no blockers; advisories led to a single-read
  `readObject` in confirm (instead of head + read), big-endian/ID3/boundary and
  truncated-EXIF tests, and documenting that only JPEG IFD0 EXIF is inspected.
  GREEN: api 1316/1316, db 38/38. No commit yet. Merged as PR #93
  (commit `7163c52`).
- 2026-11-21: T8 staging round trip on `main`. Staging D1 already had
  migrations 0014–0016 and the three unique indexes; the API Worker was
  redeployed (version `c655ea10`), health reports media configured, and the R2
  CORS rules from `packages/api/r2-cors.json` were applied to
  `aqui-suena-media-staging`. An authenticated API probe ran 27/27 checks:
  provisioning, business creation, avatar presign/PUT/confirm/list/signed
  read/delete, magic-byte and GPS-EXIF rejection, flyer attach/public
  read/carousel/replace/delete, community product-photo rejection, a seeded
  paid subscription enabling product-photo attach, duplicate attach CONFLICT,
  photo public read/replace/delete, object removal on delete, account deletion
  and Supabase user cleanup. The retention purge was exercised with a synthetic
  expired business: the admin endpoint answered `200 {businesses:1, media:1}`,
  the business and media rows were gone, the object returned 404, and a request
  without the admin token answered 404. Test data and objects were removed. Not
  exercised on staging: the daily orphan sweep (cron verified and unit-tested;
  no 24h-old orphan was left) and a real browser CORS preflight (the applied
  rules were listed and match the versioned file).
