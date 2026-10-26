# Implementation Plan: Ads Tiers (FREE vs PREMIUM Sheets)

## Overview

Tiered ads sheets that make PREMIUM (= Monthly plan) visibly worth paying for. FREE registers basic business info only (logo, phone, WhatsApp, address, open/closed, delivery flag) plus one flyer upload; FREE allows zero structured products — the product list with prices and product images is PREMIUM-only. Structured listing DATA is the source of truth; the flyer IMAGE is decoration only and counts against the photo quota — the flyer never parses into products. Reference fixture: a flyer with 6 products, so FREE renders the basic sheet + flyer image with zero structured rows while PREMIUM shows all six as structured data. Directory caps, sheet contracts, ranked carousel, shared UI, and flyer policy are delivered as vertical slices with player-safe audio throughout.

> Authoritative rule (2026-10-12): FREE = basic info + flyer decor, zero structured products; PREMIUM = full catalog. Resolved 2026-10-12: SPEC-memberships.md revised to free products 0; plan and SPEC aligned.

## Architecture Decisions

- Single entitlements resolver (`packages/api/src/entitlements.ts`) is the only authority for tier limits; no hardcoded limits elsewhere. FREE resolves to `products: 0` (structured product listing disabled) with photo quota retained for flyer/logo (e.g. 3, exact number open); Monthly resolves to `products: 100, photos: 30`.
- Server-side caps enforced in API routers with `UPGRADE_REQUIRED` error code plus upgrade hints; FREE product mutations are rejected outright (zero structured products allowed); excess Monthly items are hidden, never deleted.
- Sheet contract is additive-first: `BasicSheetDto` (basic info + flyer image only, NO product list) vs `RichSheetDto` (rich extends basic with full product list + prices) — no divergent shapes.
- Deterministic `rankSponsors` ordering by priority + recency; ineligible sponsors never appear; impressions logged.
- Shared Tamagui carousel (`packages/ui`) consumed by both web and native; player-safe sheets that never pause audio.
- Flyer image counts as 1 against the photo quota on both plans; product counts derive only from structured data, never from flyer OCR/parsing. FREE flyer is the only merchandising surface on FREE; structured products are counted for PREMIUM only.
- DATA-is-truth still holds: flyer pixels never become structured product rows.

## Task List

### Phase 1: Entitlements + Directory Caps

- [ ] Task 1: Entitlements matrix + resolver (S)
- [ ] Task 2: Directory schema + server caps (M)

### Checkpoint A: Foundation

- [ ] Tasks 1-2 green: matrix 100% covered, FREE product create denied with UPGRADE_REQUIRED + hint, flyer upload accepted against photo quota, headed FREE product attempt shows hint
- [ ] `pnpm --filter @aqui-suena/api test` and `pnpm -r build` pass
- [ ] Review with human before proceeding

### Phase 2: Sheet Contract + Ranked Carousel

- [ ] Task 3: Sheet contract basic vs rich (S)
- [ ] Task 4: Ranked ads carousel (S)

### Checkpoint B: Contracts + Ranking

- [ ] FREE resolves to basic sheet, Monthly resolves to rich sheet, contract has no router/UI imports
- [ ] Monthly ranks above FREE deterministically, ineligible never appear, impressions logged, 100% ranking coverage
- [ ] Review with human before proceeding

### Phase 3: Shared UI + Flyer Policy

- [ ] Task 5: Shared carousel on real inventory (M)
- [ ] Task 6: Basic + rich sheets player-safe (M)
- [ ] Task 7: Flyer policy + WhatsApp + hints (S)

### Checkpoint C: Complete

- [ ] Full tier-gap flow verified headed on web + native (FREE shows basic info + flyer with zero structured rows and product create rejected with hint; PREMIUM shows full catalog + badge; audio uninterrupted)
- [ ] Typecheck + Biome + tests + build green
- [ ] Human confirms tier gap is worth paying for

## Risks and Mitigations

| Risk                                                                                                 | Impact | Mitigation                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Flyer bypass (products smuggled via flyer image instead of DATA)                                     | High   | DATA-truth rule enforced + 6-product flyer fixture test; products count only from structured data; FREE flyer renders as image only, zero structured rows    |
| Free-product bypass via flyer (owner treats flyer as a product list to evade the zero-products rule) | High   | Image never becomes data: flyer pixels contribute zero structured rows by construction; fixture asserts 6-product flyer on FREE renders zero structured rows |
| SPEC-memberships drift (prior `free.products: 5` vs authoritative `0`)                               | High   | Resolved 2026-10-12: SPEC-memberships.md revised to free products 0; plan and SPEC aligned. Resolver implements 0                                            |
| Sheet open/close pauses audio                                                                        | High   | Player-safe sheets; AUDIO INVARIANT asserted in Tasks 5-6 acceptance and e2e                                                                                 |
| Entitlement drift (limits duplicated across routers/UI)                                              | High   | Single resolver; no hardcoded limits elsewhere; matrix coverage 100%                                                                                         |
| UI imports router internals                                                                          | Med    | Contract module has no router/UI imports; sheet DTOs only                                                                                                    |
| Ranking weight churn                                                                                 | Med    | Deterministic priority + recency; weights in one module with full test coverage                                                                              |
| Rich-sheet creep (basic slowly gains rich fields)                                                    | Med    | Additive contract: rich extends basic; basic field list pinned by test                                                                                       |
| Spot badge without queue discipline                                                                  | Low    | Spot marker tied to ranking output only; no standalone badge flag                                                                                            |

## Open Questions

- Confirm DATA-truth rule with stakeholder (flyer never contributes product data)?
- Confirm flyer counts as 1 against photo quota on both plans?
- WhatsApp: deep-link vs plain number display, and exact basic vs rich scope for contact actions?
- Ranking weight tuning: priority vs recency balance?
- Spot cadence: value of X (rotation interval)?
- Naming: PREMIUM vs Monthly in customer-facing copy (artifacts stay in English)?
- Category enum final list + hosting/media storage limits?
- Free photo quota exact number for flyer/logo (currently assumed 3 — confirm)?
- Does FREE get more than one flyer, or exactly one?
- Resolved 2026-10-12: SPEC-memberships.md revised to free products 0; plan and SPEC aligned (prior revision-approval question closed).

## Parallelization Opportunities

- Safe to parallelize: Task 3 (sheet contract) with Task 4 (ranking) after Tasks 1-2 land; e2e specs after shared UI exists; docs/changelog updates.
- Must be sequential: Task 1 before Task 2 (caps consume resolver); Tasks 3-4 before Tasks 5-6 (UI consumes contract + ranking); Task 7 after Task 2 (quota check builds on caps).
- Needs coordination: API contract shapes (`BasicSheetDto`/`RichSheetDto`, ranked inventory payload) defined before web + native UI parallelize; flyer quota semantics shared between owner router and listing form.
