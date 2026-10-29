# Ads Tiers Track — Task Checklist (FREE vs PREMIUM)

> Separate track from the radio-playback MVP. Do not mix with `tasks/plan.md` / `tasks/todo.md`.

## Task 1: Entitlements matrix + resolver — DONE 2026-10-28

**Description:** Implement the single entitlements resolver that maps plan to limits for listings, products, photos, and feature flags. FREE allows zero structured products (product listing disabled); photo quota retained for flyer/logo. Landed on branch `feature/ads-tiers-entitlements` (commit pending).

**Acceptance criteria:**
- [x] Exact matrix: FREE `{products: 0, photos: 3, product listing disabled}` vs Premium `{products: 100, photos: 30}` resolved by one function. SPEC uses `free`/`premium` PlanIds (todo calls Monthly → `premium`).
- [x] `canCreateProduct("free")` returns `{ allowed: false, code: "UPGRADE_REQUIRED", hint }`; premium returns `{ allowed: true }`. `assertCanCreateProduct` throws typed `UpgradeRequired`.
- [x] 100% matrix coverage by unit tests (12 new tests in `entitlements.test.ts`).
- [x] No hardcoded tier limits outside `ENTITLEMENTS` (matrix is the single source).

**Verification:**
- [x] Tests pass: `pnpm --filter @aqui-suena/api test` (67 passed)
- [x] Build succeeds: `pnpm -r build` (typecheck clean)
- [x] Biome clean on touched files

**Files touched:**
- `packages/api/src/entitlements.ts` (new)
- `packages/api/src/entitlements.test.ts` (new)
- `packages/api/package.json` (added `./entitlements` subpath export)

**Dependencies:** None

**Files likely touched:**
- `packages/api/src/entitlements.ts`
- `packages/api/src/entitlements.test.ts`

**Estimated scope:** Small: 1-2 files

## Task 2: Directory schema + server caps — DONE 2026-10-29

**Description:** Add directory listing schema and enforce tier caps server-side so FREE product mutations are rejected outright while excess Monthly items are hidden with upgrade hints, never deleted. Completed on branch `feature/ads-tiers-directory-schema`, including commits 70b41e8, 6eacb03, edf87ce, 79500f2, 08d71ea and aa17682.

**Acceptance criteria:**
- [x] Server enforces caps; FREE product mutations rejected server-side with typed `UPGRADE_REQUIRED` + upgrade hint; excess Monthly listings/products hidden, not deleted (list caps products via capProducts, input not mutated)
- [x] Flyer upload allowed on FREE and counts 1 against the photo quota (addPhoto flyer/logo within isWithinPhotoQuota)
- [x] Plan-gated violations return `UPGRADE_REQUIRED` with upgrade hints (createProduct, addPhoto); Premium quota exhaustion returns a domain-specific error instead
- [x] Open/closed status derived server-side (isOpenNow + deriveListingOpen, IANA timezone validated)
- [x] (G) Product photos quota enforced in premium (photosPerProduct: 3); the fourth photo returns PRODUCT_PHOTO_QUOTA_EXCEEDED without an upgrade prompt
- [x] (H) Phone format validation uses E.164 (`+` followed by 2-15 digits, first digit 1-9); malformed values are rejected by listingInputSchema

**Verification:**
- [x] Tests pass: API business-router tests (110 api + 6 db green)
- [x] G verification: focused business-router tests (18), full API suite, API typecheck and Biome check green; Biome reports only the existing informational schema-version notice
- [x] H verification: focused listing-schema tests, full API suite, API typecheck and Biome check green
- [x] Manual check (headed): deferred with maintainer approval because the owner UI does not exist yet; run when that UI lands
- [x] Review with human before proceeding (Checkpoint A): maintainer authorized integration on 2026-10-29

**Files touched:**
- packages/db/src/schema.ts (businesses, products, photos, hours + updatedAt)
- packages/db/src/schema.test.ts
- packages/db/src/index.ts
- packages/api/src/listing.ts (schema, isOpenNow, deriveListingOpen, capProducts)
- packages/api/src/listing.test.ts
- packages/api/src/routers/business.ts (createProduct, addPhoto, get, list, create)
- packages/api/src/routers/business.test.ts
- packages/api/src/router.ts
- packages/api/package.json (subpath exports)

**Dependencies:** Task 1

**Files likely touched:**
- `packages/db/src/schema.ts`
- `packages/api/src/routers/business.ts`
- `packages/api/src/routers/business.test.ts`
- `schemas/listing.ts`

**Estimated scope:** Medium: 3-5 files

## Checkpoint A: After Tasks 1-2

- [x] Entitlements matrix 100% covered, no hardcoded limits elsewhere
- [x] Server caps hide (never delete) excess; `UPGRADE_REQUIRED` with hints verified
- [x] `pnpm --filter @aqui-suena/api test` and `pnpm build` green (8/8 build tasks)
- [x] Review with human before proceeding; headed UI check deferred until the owner UI exists

## Task 3: Sheet contract basic vs rich

**Description:** Define the additive sheet DTO contract: basic fields + flyer image for FREE (no product list), rich extension for Monthly, with no router or UI coupling.

**Acceptance criteria:**
- [ ] Basic sheet: logo, phone, WhatsApp, address, open/closed, delivery flag — plus flyer image only; BasicSheetDto has NO product list
- [ ] Rich sheet adds: full product list + prices, product images, extended hours, spot marker (no plan-tier badge; priority is applied silently in carousel ranking)
- [ ] FREE resolves to basic, Monthly resolves to rich
- [ ] Contract module has no router/UI imports

**Verification:**
- [ ] Tests pass: `pnpm --filter @aqui-suena/api test` (sheets contract tests)
- [ ] Build succeeds: `pnpm -r build`

**Dependencies:** Tasks 1-2

**Files likely touched:**
- `packages/api/src/sheets.ts`
- `packages/api/src/sheets.test.ts`

**Estimated scope:** Small: 1-2 files

## Task 4: Ranked ads carousel

**Description:** Implement deterministic sponsor ranking (priority + recency) and the ranked ads endpoint with impression logging.

**Acceptance criteria:**
- [ ] Monthly ranks above FREE deterministically
- [ ] Ineligible sponsors never appear
- [ ] Impressions logged
- [ ] 100% ranking coverage by unit tests

**Verification:**
- [ ] Tests pass: `pnpm --filter @aqui-suena/api test` (ranking tests)
- [ ] Build succeeds: `pnpm -r build`

**Dependencies:** Tasks 1-3

**Files likely touched:**
- `packages/api/src/ranking.ts`
- `packages/api/src/ranking.test.ts`
- `packages/api/src/routers/ads.ts`

**Estimated scope:** Small: 1-2 files

## Checkpoint B: After Tasks 3-4

- [ ] FREE → basic sheet, Monthly → rich sheet, no router/UI in contract
- [ ] Ranking deterministic, ineligible excluded, impressions logged, 100% coverage
- [ ] Tests + build green
- [ ] Review with human before proceeding

## Task 5: Shared carousel on real inventory

**Description:** Build the shared Tamagui carousel fed by real ranked inventory and mount it on web + native home, keeping audio uninterrupted.

**Acceptance criteria:**
- [ ] Real ranked inventory renders on web + native from shared code (`packages/ui`); FREE card shows basic info + flyer, never a product list; PREMIUM shows full catalog
- [ ] AUDIO INVARIANT: scrolling/interacting with the carousel never pauses audio; audio pauses only via the explicit player pause button
- [ ] No dock/player overlap at 320 / 768 / 1024 / 1440

**Verification:**
- [ ] Tests pass: e2e `ads.spec.ts`
- [ ] Build succeeds: `pnpm -r build`
- [ ] Manual check (headed): scroll carousel during playback, audio continues

**Dependencies:** Tasks 3-4

**Files likely touched:**
- `packages/ui/src/ads-carousel.tsx`
- `apps/web/app/page.tsx`
- `apps/mobile/app/index.tsx`
- `e2e/ads.spec.ts`

**Estimated scope:** Medium: 3-5 files

## Task 6: Basic + rich sheets player-safe

**Description:** Build player-safe basic and rich business sheets with accessible dialog behavior, keeping audio uninterrupted.

**Acceptance criteria:**
- [ ] FREE → basic sheet with exact pinned fields + flyer image, never a product list; Monthly → rich sheet with full catalog + spot marker (no plan-tier badge; priority is applied silently in carousel ranking)
- [ ] AUDIO INVARIANT: opening/closing sheets never pauses audio for FREE or PREMIUM; audio pauses only via the explicit player pause button
- [ ] Accessible dialog: focus trap/restore, Esc to close, aria roles/labels

**Verification:**
- [ ] Tests pass: `packages/ui` sheet unit test + e2e sheet specs
- [ ] Build succeeds: `pnpm -r build`
- [ ] Manual check (headed): open/close both sheet variants during playback, audio continues

**Dependencies:** Tasks 3-5

**Files likely touched:**
- `packages/ui/src/business-sheet.tsx`
- `packages/ui/src/business-sheet.test.tsx`
- `e2e/ads.spec.ts` (sheet cases)

**Estimated scope:** Medium: 3-5 files

## Task 7: Flyer policy + WhatsApp + hints

**Description:** Enforce flyer-counts-as-photo quota, DATA-only product counts, identical WhatsApp behavior, and inline cap-hit hints. FREE flyer is the only merchandising surface on FREE; structured products are counted for PREMIUM only.

**Acceptance criteria:**
- [ ] Flyer image counts as 1 against photo quota on both plans (owner-router quota check); flyer upload allowed on FREE
- [ ] Products count only from structured DATA (6-product flyer fixture test: 6-product flyer on FREE renders basic sheet + flyer image with zero structured rows; flyer pixels contribute zero products)
- [ ] WhatsApp behavior identical on web + native
- [ ] FREE cap-hit shows inline upgrade hint, never silent

**Verification:**
- [ ] Tests pass: `pnpm --filter @aqui-suena/api test` (quota + fixture tests)
- [ ] Manual check (headed): FREE cap-hit path shows inline hint in form and sheet hint slot

**Dependencies:** Tasks 2, 5-6

**Files likely touched:**
- `packages/api/src/routers/owner.ts`
- `packages/ui/src/listing-form.tsx`
- `packages/ui/src/business-sheet.tsx` (hint slot)

**Estimated scope:** Small: 1-2 files

## Checkpoint C: Final

- [ ] Full tier-gap flow verified headed on web + native (FREE shows basic info + flyer with zero structured rows and product create rejected with hint; PREMIUM shows full catalog + badge; audio uninterrupted)
- [ ] Typecheck + Biome + tests + build green
- [ ] Human confirms tier gap is worth paying for
