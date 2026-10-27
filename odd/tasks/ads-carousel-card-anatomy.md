# Feature: ads-carousel-card-anatomy

Branch: `feature/ads-carousel` · Delivery: `ask-on-risk` · Runner: `pnpm --filter @aqui-suena/ui test` + `pnpm --filter @aqui-suena/api test` + `pnpm -r typecheck`

Build the flyer card anatomy (full-bleed image + open-status badge + pagination
dots + name + meta + CTA) for the ads carousel, rendered responsively across
mobile / tablet / web from the shared `@aqui-suena/ui` component. Spec:
`SPEC-ads-display.md` → "Carousel visual anatomy (per platform)".

## Specs

- S1 (Data model): `AdsCarouselItem` is structured `{ id, imageUrl, alt, name,
  category, delivery, opensLabel, isOpen, href? }`, canonical in
  `packages/api/src/ads.ts`, re-exported to the UI. `delivery` is a boolean
  rendered via i18n; `isOpen` drives the badge.
- S2 (Slide anatomy): full-bleed flyer image (`object-fit: cover`,
  `object-position: center top`) + open-status badge top-right (`Abierto`/
  `Cerrado`) + pagination dots overlaid bottom-center in a `role="group"`
  with `aria-label="Anuncio N de M"`.
- S3 (Mobile): vertical card — image fills the top, then an info block
  (`padding:16`, `gap:6`) with name (`fs:22`), meta (`fs:14` muted), CTA
  "Ver negocio" (primary pill).
- S4 (Wide): horizontal card — flyer panel (330px tablet / 480px web) with
  badge + dots overlaid, plus name (`fs:24` tablet / `fs:26` web) and meta in
  the info column. Contact rows + actions are out of scope (business-directory).
- S5 (Meta composition): one shared pure function composes
  `category · delivery · opensLabel`; `delivery` only when true; `opensLabel`
  only on mobile (wide shows horario in its own row, deferred).
- S6 (Empty state): centered "Aún no hay negocios patrocinados" + "Vuelve
  pronto: aquí verás los negocios cerca de ti." via i18n.
- S7 (Breakpoints): card max width 390 (base) / 768 (md) / 1024 (lg) / 1440
  (xl); flyer panel width 330 (md/lg) / 480 (xl).
- S8 (i18n): add `open`, `closed`, `delivery`, `viewBusiness`,
  `noSponsoredBusinesses`, `noSponsoredBusinessesHint`, `adGroupLabel(index,
  count)` to es + en with parity.

## Tasks

- [x] T1 — i18n keys (S8). Route: inline. Files: `packages/ui/src/i18n/locales.ts`.
- [x] T2 — API data model + seed (S1). Route: inline. Files: `packages/api/src/ads.ts`.
- [x] T3 — OptimizedImage `objectPosition` + `rounded` props (S2). Route: inline.
- [x] T4 — Responsive helpers 390/768/1024/1440 + flyer width (S7). Route: inline.
- [x] T5 — `composeMeta` pure function (S5). Route: inline.
- [x] T6 — Card component rewrite: badge + dots overlay + name + meta + CTA +
  empty state (S2/S3/S4/S6). Route: inline.
- [x] T7 — Tests: card anatomy, composeMeta, responsive, empty state (RED →
  GREEN), plus updated api seed assertions (S1–S8). Route: inline.

## Log

L1 (2026-10-26, user): "User requested adding it to a spec first, then starting the card anatomy, for all platforms not only mobile."

L2 (2026-10-26, user): "Requirement: share as much code as possible across platforms." — choose structured meta over a flat `meta` string.

L3 (2026-10-26, user): delivery label is canonical "Servicio a domicilio" on
all platforms.

L4 (2026-10-26, user): "User requested it clean, with no disclosure." — no sponsorship badge.

L5 (2026-10-26, user): "User chose option A: card anatomy only; the
directory list and contact detail panel belong to SPEC-business-directory.md.

L6 (2026-10-26, verification): `pnpm -r typecheck` green across all packages +
apps. `@aqui-suena/ui` test 131 passed, `@aqui-suena/api` test 55 passed.
