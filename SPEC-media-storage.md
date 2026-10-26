# Spec: media-storage — Aquí Suena (by 17Labs)

## Objective

Centralize all media (product photos, sponsor flyers, spot audio, owner avatars) on Cloudflare R2 with free-tier limits, and optimize image delivery to the listener and owner apps without interrupting playback. Users: owners upload via owner-portal; listeners read via ads-display and business-directory. Success = fast, cheap, secure media across web and native with no third-party provider dependency.

## Tech Stack

- Storage: Cloudflare R2 (free: 10GB, 1M Class A ops/month, 10M Class B ops/month, egress free)
- Image optimization: Cloudflare Image Resizing (free tier on Workers Paid, but R2 + Workers AI free tier covers transforms via Worker) — client-side compression as fallback
- Upload pattern: presigned URLs (R2 supports S3-compatible presigned PUT)
- DB: Drizzle + SQLite/D1 (media metadata: key, owner, type, size, mime, createdAt)
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
packages/api/src/routers/media.ts   → media.presignUpload / media.confirm / media.list / media.delete
packages/api/src/r2-client.ts      → R2 S3-compatible client (presigned URLs, head, delete)
packages/db/src/schema.ts          → media table (id, ownerId, type, r2Key, mime, size, createdAt)
packages/ui/src/media-picker.tsx    → shared upload + preview component (Tamagui)
packages/ui/src/optimized-image.tsx → shared image with lazy loading + blur placeholder + responsive sizes
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

1. Client requests a presigned PUT URL from `media.presignUpload` (tRPC, auth required).
2. Server validates type/size limits, generates a unique R2 key, returns the presigned URL.
3. Client uploads directly to R2 (no server proxy, saves bandwidth).
4. Client calls `media.confirm` with the R2 key; server stores metadata in DB.
5. Client receives the public URL (R2 custom domain or worker proxy).

## Image Optimization (listeners)

- Lazy loading: images load when entering viewport (IntersectionObserver).
- Responsive sizes: serve appropriate width via `srcset` (320w, 640w, 960w).
- Format: prefer WebP/AVIF via `Accept` header negotiation (Cloudflare does this automatically).
- Blur placeholder: low-quality inline placeholder while loading.
- Cache: `Cache-Control: public, max-age=31536000, immutable` (content-addressed keys).
- Never block audio: images load asynchronously, player never waits for media.

## Code Style

Presigned URL generation with validation:

```ts
// packages/api/src/r2-client.ts
export async function presignUpload(
  key: string,
  contentType: string,
  maxSize: number,
): Promise<string> {
  // Validate contentType against allowlist and size against limit before signing
  // Return a time-limited PUT URL (5 min expiry)
}
```

Conventions: all media keys are content-addressed (hash of content + owner) for immutable caching; uploads go directly to R2 (no server proxy); client-side compression before upload for images; audio normalized at upload; virus/size guards on server (reject oversized or wrong mime).

## Testing Strategy

- Framework: Vitest + Testing Library; Playwright headed for upload flows.
- Locations: `packages/api/src/r2-client.test.ts`, `packages/ui/src/media-picker.test.tsx`, `packages/ui/src/optimized-image.test.tsx`.
- Coverage: 100% on presign validation (type/size limits) and image state machine.
- Levels: unit (presign validation, size limits) → integration (presign → upload → confirm → metadata stored) → e2e (owner uploads photo, listener sees it optimized).

## Boundaries

- Always: validate type and size before presigning, use content-addressed keys for immutable caching, compress images client-side, normalize audio at upload, run `typecheck + lint + test` before commit, keep audio playing during uploads.
- Ask first: add a new media type, change size limits, add video support, enable Cloudflare Image Resizing (paid tier).
- Never: proxy uploads through the server (waste bandwidth), store raw uploads without validation, exceed R2 free tier (10GB), use Cloudflare Images (paid) without approval, block audio during upload, expose R2 credentials to client.

## Success Criteria

- Owner uploads a product photo → presigned URL → direct R2 upload → metadata stored → listener sees optimized image in <2s on 4G.
- Flyer images in the sponsor carousel load lazily with blur placeholder, no layout shift.
- Spot audio uploads (max 30s MP3) normalize loudness and store metadata.
- R2 free tier is not exceeded (monitoring via Cloudflare dashboard).
- Upload works on web, native (Expo) and desktop (Tauri) from shared `media-picker` component.
- Content-addressed keys enable infinite cache TTL (immutable).
- No third-party provider dependency (R2 + Workers only, all free tier).

## Open Questions

- Should we use Cloudflare Image Resizing (paid, $5/mo for 50k transforms) or client-side compression only? (Recommendation: client-side compression for V1, Image Resizing for V2 if budget allows.)
- R2 custom domain vs Worker proxy for serving? (Recommendation: Worker proxy for dev, custom domain for prod — both free.)
- Should avatars be stored in R2 or Supabase Storage? (Recommendation: R2 for consistency.)
