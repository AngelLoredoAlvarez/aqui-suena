# Feature: web-image-cache — Stable public image URLs for web and desktop

## Objective

Serve landing flyer images from a stable public API URL so browsers and the
desktop webview can cache them across visits, while private and owner media keep
their short-lived signed URLs. Branch: `feat/web-image-cache`. Delivery:
single PR. Test runner: Vitest (`pnpm --filter @aqui-suena/api test`).

## Specs

- **S1** `GET /images/<r2Key>` on the API Worker serves flyer images without a
  signature query. The URL is built from the immutable R2 key, so repeated
  carousel fetches return the same `imageUrl`.
- **S2** The route serves only media whose kind is `flyer`, attached to a flyer
  whose business is publicly visible. Invalid keys, unknown media, hidden
  businesses, unattached media and non-flyer kinds answer `404`; a missing
  storage adapter answers `503`. Error responses are `no-store`.
- **S3** Successful responses carry `Cache-Control: public, max-age=86400`,
  the stored content type, `ETag`, `X-Content-Type-Options: nosniff`, and the
  object bytes. Object keys stay immutable.
- **S4** `ads.carousel` returns the public image URL built from the request
  origin (`ctx.origin`). Legacy flyer rows without `mediaId` keep their external
  `url`; an unconfigured storage adapter keeps excluding the item, as today.
- **S5** Owner, directory and fiscal media keep using signed URLs; the signed
  URL TTL stays 300 seconds. No service worker is required for this cache.
- **S6** Web and desktop receive the same URL because both call the API; the
  native app keeps working through the existing expo-image adapter.
- **S7** Tests cover the URL builder, the route visibility/status matrix and the
  carousel contract; media and offline specs plus the README describe the new
  cache path.

## Tasks

- [x] T1 — Public URL builder and resolver (`buildPublicImageUrl`,
      `resolvePublicImageUrl`) with unit tests (S1, S4).
- [x] T2 — `GET /images/*` route with the visibility matrix tests (S2, S3).
- [x] T3 — Carousel wiring through the request origin and contract test updates
      (S4).
- [x] T4 — Docs: README, SPEC-media-storage, SPEC-offline, backlog (S7).
- [x] T5 — Verification: biome, typecheck, API tests, web build (S1-S7).

## Log

- L1 — Implement a stable public image proxy for landing flyers so web and
  desktop cache images across visits; keep private/owner media signed and the
  300-second TTL unchanged.
- L2 — Scope confirmed to the ads carousel flyers; directory and owner media
  remain signed for now.
- L3 — Implementation landed: `GET /images/<r2Key>` rechecks flyer attachment
  and business visibility on every uncached request, serves one-day public
  cache headers, and the carousel builds absolute URLs from the tRPC request
  origin. Browser and desktop caching need no service worker.
- L4 — Verification: API 146 files / 1355 tests, typecheck 7/7, Biome clean,
  Next static build passes.
- L5 — Independent review found a Biome formatting failure in this document and
  two test gaps; the document was formatted and regression tests now pin the
  row-kind defense, unknown media, the cross-business flyer, error `no-store`
  headers, the exact stable URL and the legacy external URL.
