# Spec: media-storage — Aquí Suena (by 17Labs)

> **Status: partial (2026-11-20).** Backend complete: `ObjectStorage` port, `R2ObjectStorage` presigned uploads, D1 media repository, `media` router and explicit `503` when unconfigured; the flow (presign → direct R2 upload → `confirm` → `delete`) is verified end to end on staging. The D1 foundation for owner media landed: `media.business_id` (nullable, FK to `businesses`, no cascade) and a unique index on `media.r2_key` (migration `0014_little_shadowcat`). New uploads use the `media/v1/{accountId}/{scope}/{kind}/{uuid}.{ext}` layout, generated server-side; `presignUpload` and `confirm` enforce business ownership and the plan media entitlement; `confirm` parses the grammar, validates account/kind/extension and returns the existing row when the same object is confirmed twice. `media.signedUrl` returns a short-lived signed GET for the owner; public listing reads are signed per request inside the directory and ads endpoints when the media is attached to a visible listing. Lifecycle is in place: a daily cron purges businesses past their 90-day retention (objects before rows) and sweeps unreferenced uploads older than 24 hours, while account deletion purges the account prefixes as a fail-safe. `photos` and `flyers` link to `media` through nullable `media_id` columns (legacy `url` values stay readable). Missing: hardening (T7), the staging round trip (T8), the shared upload picker and responsive image variants (WebP/AVIF, `srcset`). Legacy flat keys remain valid for reads and deletes, but `confirm` accepts only v1 keys. The same bucket also holds stamped CFDI documents under the `cfdi/` prefix; those are fiscal archives written by the billing context, not media, and the media key layout never overlaps them.

## Objective

Centralize all media (product photos, sponsor flyers, spot audio, owner avatars) on Cloudflare R2 with free-tier limits, and optimize image delivery to the listener and owner apps without interrupting playback. Users: owners upload via owner-portal; listeners read via ads-display and business-directory. Success = fast, cheap, secure media across web and native with no third-party provider dependency.

## Tech Stack

- Storage: Cloudflare R2 (free: 10GB, 1M Class A ops/month, 10M Class B ops/month, egress free)
- Image optimization: Cloudflare Image Resizing (free tier on Workers Paid, but R2 + Workers AI free tier covers transforms via Worker) — client-side compression as fallback
- Upload pattern: presigned URLs (R2 supports S3-compatible presigned PUT)
- DB: Drizzle + SQLite/D1 (media metadata: key, owner, optional business scope, kind, size, mime, createdAt; one row per object key)
- Language: TypeScript strict
- Lint/format: Biome (replaces ESLint + Prettier)

## Commands

```
Dev web: pnpm --filter web dev
Build: pnpm -r build
Test: pnpm -r test -- --run
Lint: pnpm exec biome check --write .
Typecheck: pnpm -r typecheck
```

## Project Structure

```
packages/api/src/server/routers/media/media.ts → media.presignUpload / media.confirm / media.list / media.signedUrl / media.delete
packages/api/src/domain/media/key.ts → media/v1 key builder and parser (account vs business scope)
packages/api/src/infrastructure/media/r2-object-storage.ts → R2 S3-compatible client (presigned URLs, head, delete)
packages/db/src/schema.ts          → media table (id, ownerId, businessId?, kind, r2Key unique, mime, size, createdAt)
packages/ui/src/optimized-image/optimized-image.tsx → shared image with lazy loading + blur placeholder
packages/ui/src/media-picker.tsx   → shared upload + preview component (Tamagui) — not built yet
apps/web/public/test-streams/      → dev audio fixtures (gitignored .m4a)
```

## Free-Tier Limits (hard)

- R2 storage: 10GB total across all media types.
- Class A ops (PUT/POST/DELETE): 1M/month.
- Class B ops (GET/HEAD): 10M/month.
- Egress: free (R2 has no egress fees).
- Per-file limits (enforced client-side + server-side):
  - Product photos: max 2MB, JPG/PNG/WebP, auto-compressed client-side.
  - Sponsor flyers: max 1MB, JPG/PNG/WebP.
  - Spot audio: max 30s MP3, loudness normalized at upload.
  - Owner avatars: max 500KB, JPG/PNG/WebP.

## Upload Flow

1. Client requests a presigned PUT URL from `media.presignUpload` (tRPC, auth required) with `kind`, `contentType`, `sizeBytes` and, for business media, `businessId` (never for an avatar).
2. Server validates the type/size limits and the scope, checks that the business belongs to the authenticated account and that the plan allows the kind (otherwise `NOT_FOUND` or `FORBIDDEN: UPGRADE_REQUIRED`), generates the `media/v1/...` key server-side (UUID and extension included), and returns the presigned URL.
3. Client uploads directly to R2 (no server proxy, saves bandwidth).
4. Client calls `media.confirm` with the key and the declared kind/type/size. The server parses the v1 grammar, requires the account and kind to match the authenticated user, revalidates business ownership and the plan entitlement, requires the key extension to match the declared content type (otherwise `NOT_FOUND`), compares the declared values with the object's real metadata (`BAD_REQUEST` on mismatch), revalidates the real type/size against the kind limits, and stores only the stored metadata. Confirming the same object again returns the existing row instead of creating a duplicate.
5. The response carries the media row and its absolute key. `media.signedUrl` returns a short-lived signed GET URL for the owner of the row; public listing reads are signed per request by the directory and ads endpoints when the media is attached to a visible listing.

Storage is an explicit dependency, never a silent in-memory fake. `/health`
reports `media: "configured" | "unconfigured"`; when the R2 credentials are
missing or only partially set, any media mutation answers
`503 SERVICE_UNAVAILABLE` with `media storage is not configured`.

## Key layout (2026-11-20)

New owner uploads use `media/v1/{accountId}/{scope}/{kind}/{uuid}.{ext}`, where
`scope` is `businesses/{businessId}` for business media or `account` for
account-level media. The layout is versioned because it changed; `media.r2Key`
stays absolute, so old keys remain valid and a future `v2` can coexist without
moving objects. Business ownership and plan entitlement are enforced at presign
and confirm; `media.signedUrl` signs owner reads, while public listing reads and
deletion/retention remain specified with their slices in
`odd/tasks/feat-owner-media-r2.md`.

The builder and parser live in `packages/api/src/domain/media/key.ts` as pure
functions. A client never chooses a key: it only chooses the kind, content type,
size and (for business media) the business id. Avatars are always account-scoped
and reject a `businessId`; the other kinds require one.

### Plan entitlements (T3)

`packages/api/src/domain/media/entitlement.ts` maps the existing plan tiers to
media kinds: avatars are account-level and available to every plan; every tier
includes flyers; `product-photo` requires the `full` media tier (paid plans);
`spot-audio` requires `spotEligible`, which stays off until the top tier
launches. A rejected upload answers `FORBIDDEN` with
`UPGRADE_REQUIRED: billing.upgradeRequired.mediaUpload`.

### Data model landed by T1

Migration `0014_little_shadowcat` adds the storage foundation without touching
existing rows:

- `media.business_id` is nullable and references `businesses(id)` with no
  cascade. Account-level media (avatars) keeps `NULL`; business media carries
  the owning business. Deleting a business requires deleting its media objects
  and rows explicitly first, so no object is orphaned behind a cascaded row.
- `media.r2_key` has a unique index (`media_r2_key_unique`). It is what makes
  idempotent `confirm` possible: the same object cannot produce two rows.
- Old flat keys such as `product-photo/acc_123/9f2c...` stay valid and are
  stored unscoped (`business_id` NULL) because `r2_key` is absolute.
- The migration is additive (`ALTER TABLE ... ADD COLUMN` plus a unique index),
  so it preserves existing rows and does not rebuild the table.
- Deployment precondition: a database that already ran the flat layout must
  have no two `media` rows with the same `r2_key`, because the old `confirm`
  inserted on every call. Check and deduplicate (keep one row per key) before
  applying; the migration never deletes data on its own.
- Confirming the same object twice returns the existing row: the router looks
  up the key first and re-reads it if a concurrent insert loses the race. Legacy
  flat keys are no longer accepted by `confirm` (reads and deletes still work),
  so only in-flight uploads from before the deploy can surface `NOT_FOUND`.

### Listing links (T6)

`photos.media_id` and `flyers.media_id` are nullable FKs to `media` with
`ON DELETE CASCADE`; `url` is now nullable and a check constraint requires at
least one of the two. Existing rows keep their legacy URL with a null media id.
Writes require a media id: the row is validated against the owner, the business
and the expected kind (`product-photo` for photos, `flyer` for flyers), and the
old media is deleted after a replacement. A media row attaches to at most one
listing row; attaching it again answers `CONFLICT`, and unique indexes on
`photos.media_id`/`flyers.media_id` (migration `0016_tense_hellfire_club`) make
that rule hold under concurrent requests. Deleting a photo or flyer deletes its
media row and object. Deleting media cascades the attachment row.

Public reads resolve the media link at request time: the directory and ads
endpoints sign the object key when the row has media and the business is
visible, and return the legacy URL otherwise. There is no standalone public
media endpoint; every signed URL is scoped to a listing response.

## Lifecycle (T5)

- **Order.** Purges delete the object first and then its row, so a row never
  points at a missing object. A retried delete tolerates `404` when the object
  is already gone.
- **Account deletion.** The paginated row purge runs first, then a fail-safe
  lists and deletes the account prefixes (`media/v1/{accountId}/` plus the four
  legacy `{kind}/{accountId}/` prefixes). A fail-safe error is reported and does
  not abort the rest of the deletion.
- **Retention.** The `*/15` cron keeps its existing jobs. A separate daily cron
  (`0 3 * * *`) runs media maintenance: it calls `PurgeExpiredBusinesses`, which
  lists businesses past `retained_until`, deletes their media objects and rows,
  and only then deletes the business. The admin endpoint
  `GET /admin/purge-expired-businesses` runs the same service and answers
  `{ businesses, media }`; it answers `503` when media storage is unconfigured.
- **Orphan uploads.** The same daily cron runs `SweepMediaOrphans`: it lists the
  `media/` prefix, keeps every key with a row, and deletes unreferenced objects
  older than 24 hours. Legacy presigns stopped with T2, so legacy orphan keys are
  not swept automatically; account deletion still covers them per account.
- **Legacy scope.** Retention purges media rows scoped to the business
  (`business_id`). Legacy rows with `business_id NULL` stay tied only to the
  account and are removed by account deletion; retention does not touch them.

## Image Optimization (listeners)

- Lazy loading: images load when entering viewport (IntersectionObserver).
- Responsive sizes: serve appropriate width via `srcset` (320w, 640w, 960w).
- Format: prefer WebP/AVIF via `Accept` header negotiation (Cloudflare does this automatically).
- Blur placeholder: low-quality inline placeholder while loading.
- Cache: `Cache-Control: public, max-age=31536000, immutable` (unique immutable keys).
- Never block audio: images load asynchronously, player never waits for media.

## Code Style

Server-generated key with validation:

```ts
// packages/api/src/domain/media/key.ts
buildMediaKey({
  accountId,
  businessId, // omitted for account media (avatars)
  kind,
  contentType,
});
// media/v1/{accountId}/{scope}/{kind}/{uuid}.{ext}
```

The builder validates the kind, its allowed content types and the scope, and generates the UUID. The client never supplies a key.

Conventions: media keys are unique and immutable (UUID), never overwritten; the client never chooses a key; uploads go directly to R2 (no server proxy); client-side compression before upload for images; audio normalized at upload; virus/size guards on server (reject oversized or wrong mime). Content-addressed keys and deduplication are deferred: the direct upload path cannot verify a content hash without downloading the object, and dedup would require reference counting for deletes.

## Testing Strategy

- Framework: Vitest + Testing Library; Playwright headed for upload flows.
- Locations: `packages/api/src/domain/media/key.test.ts`, `packages/api/src/domain/media/entitlement.test.ts`, `packages/api/src/domain/media/sweep-orphans.test.ts`, `packages/api/src/domain/directory/purge-expired-businesses.test.ts`, `packages/api/src/infrastructure/media/r2-object-storage.test.ts`, `packages/api/src/server/routers/media/media.test.ts`, `packages/ui/src/optimized-image/optimized-image.test.tsx`; the media picker test lands with the picker.
- Coverage: 100% on key grammar, presign validation (type/size limits) and the confirm state machine.
- Levels: unit (presign validation, size limits) → integration (presign → upload → confirm → metadata stored) → e2e (owner uploads photo, listener sees it optimized).

## Boundaries

- Always: validate type and size before presigning, verify business ownership and the plan media entitlement on presign and `confirm`, revalidate the real object metadata and the key grammar on `confirm` (never persist client-declared type/size), use unique immutable keys for caching, compress images client-side, normalize audio at upload, run `typecheck + lint + test` before commit, keep audio playing during uploads.
- Ask first: add a new media type, change size limits, add video support, enable Cloudflare Image Resizing (paid tier).
- Never: proxy uploads through the server (waste bandwidth), store raw uploads without validation, serve objects without an authorization check (the bucket stays private), exceed R2 free tier (10GB), use Cloudflare Images (paid) without approval, block audio during upload, expose R2 credentials to client.

## Success Criteria

- Owner uploads a product photo → presigned URL → direct R2 upload → metadata stored → listener sees optimized image in <2s on 4G.
- Flyer images in the sponsor carousel load lazily with blur placeholder, no layout shift.
- Spot audio uploads (max 30s MP3) normalize loudness and store metadata.
- R2 free tier is not exceeded (monitoring via Cloudflare dashboard).
- Upload works on web, native (Expo) and desktop (Tauri) from shared `media-picker` component.
- Immutable keys enable infinite cache TTL.
- No third-party provider dependency (R2 + Workers only, all free tier).

## Open Questions

- Should we use Cloudflare Image Resizing (paid, $5/mo for 50k transforms) or client-side compression only? (Recommendation: client-side compression for V1, Image Resizing for V2 if budget allows.)
- R2 custom domain vs Worker proxy for serving? (Recommendation: Worker proxy for dev/staging, custom domain later — both free.)
- Should avatars be stored in R2 or Supabase Storage? (Recommendation: R2 for consistency.)
- Owner upload lifecycle: quotas and concurrency, bucket CORS, orphan sweeps and variant naming are tracked in `odd/tasks/feat-owner-media-r2.md`.
