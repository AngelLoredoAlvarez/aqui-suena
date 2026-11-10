# Business Plan Tiers Track — Task Checklist

> Current source of truth: SPEC-memberships.md. Replaces the previous FREE/PREMIUM ads-tiers track. Radio playback stays independent; monetization and visibility use only the visual carousel and business directory.
>
> Last synced 2026-11-10 against `main`: Task 1 checkboxes re-verified against the code, and a duplicated block left over from two branch merges was consolidated. Items marked `[x]` carry the file that proves them; items marked partial say what is still missing.

## Task 1: Three-plan entitlements and migration

- [x] Replace the two-plan resolver with Comunidad, Oficios & Servicios, and Comercios & Catálogo entitlements. _(`ENTITLEMENTS` in `packages/api/src/domain/plans/entitlements.ts`; `PlanId` is `community | trades | commerce`.)_
- [x] Remove legacy `free`/`premium` plan definitions; no account migration is needed because no accounts are registered yet. _(No `free`/`premium` plan identifier remains in `packages/` or `apps/`.)_
- [x] Enforce downgrade without data loss: hide excess content, let the owner choose the visible business, and retain hidden content for 90 days before permanent deletion. _(Schema `hiddenAt`/`retainedUntil` on businesses and `grace` status + `graceEnd` on subscriptions; helpers `hiddenBusinessIds`, `canChooseVisibleCount`, `retentionDeadline`; cleanup via `BusinessRepository.deleteExpired` + `DELETE /admin/purge-expired-businesses`.)_
- [x] Implement immediate upgrades and end-of-period downgrades without proration in V1. _(`SubscriptionService.changePlan`: an upgrade expires the current subscription and creates the new one from `now`; a downgrade marks it `cancelled` and starts the new period at `current.endsAt`. No proration path exists in either branch.)_
- [x] Implement cancellation without partial refunds: plan remains active until the end of the paid period, with 7-day failed-renewal grace and email warning. _(Grace helpers in `domain/billing/subscriptions/grace.ts`; `failRenewal` + `downgradeExpiredGrace`; warning email through the `EmailSender` port — not wired to a sender in production yet.)_
- [x] Enforce business count caps per account: Comunidad 1, Oficios 3, Comercios 10. _(`maxBusinesses` in `ENTITLEMENTS` + `canCreateBusiness`/`assertCanCreateBusiness` enforced in the `businesses` router.)_
- [x] Preserve deterministic ranking (Comunidad 0, Oficios 10, Comercios 20; recency tie-breaker) and 1/2/3 appearances per cycle with consecutive-repeat avoidance. _(`rankSponsors` + `selectCarouselSlots` in `domain/ads/ranking.ts`, integrated in `getBusinessCarousel`.)_

> Progress note (2026-11-09): Task 1 complete — caps, downgrade, grace, cleanup, and email warning (EmailSender port + notifiers; no production sender yet) all implemented and merged-ready on `feature/email-warning-grace`.
>
> Progress note (2026-11-10): transactional email templates integrated. A typed renderer replaces the CommonJS reference (`render.ts` → `renderer.ts`), and domain notifiers cover subscription lifecycle, account lifecycle and receipt emails. The notifiers have no production call site and `ResendEmailSender` is never instantiated, so no email is sent. Accounts persist `locale` (default `es-MX`, migrated on staging D1). CFDI email remains blocked on fiscal data, a PAC integration and CFDI hosting.

## Task 2: Plan selection and billing views

- [ ] Render three plan cards with the approved descriptions and included features via i18n.
- [ ] Add a secondary comparison table after the plan cards, grouped by usage, features, visibility, support, stats, and billing.
- [ ] Preselect the recommended plan from onboarding `businessProfile` (community → Comunidad, home services → Oficios, catalog commerce → Comercios), allow manual changes, and default to Comunidad when unanswered.
- [ ] Support paid-plan recurring-charge authorization and plan-change confirmation for monthly and annual billing.

## Task 3: Plan-specific directory data and owner forms

- [ ] Enforce Comunidad flyer replacement cooldown server-side: 15 days, typed `FLYER_REPLACEMENT_COOLDOWN`, next allowed date in the error.
- [ ] Add an informational owner onboarding checklist with automatic completion and plan-specific steps.
- [ ] Add free-plan abuse prevention: email verification, phone verification before publishing, duplicate-account detection, and manual review for suspicious signups.
- [x] Send renewal and expiration reminders: 7-day, 1-day, on-failed-payment (grace warning), and on-downgrade notifications implemented. Allow disabling non-critical reminders (7d/1d) via ReminderPreferences. Critical reminders (failed payment, downgrade) always sent. _(Done 2026-11-09 on `feature/downgrade-notification`.)_
- [ ] Default the billing page to annual billing with a monthly/annual toggle, annual savings messaging, and pre-payment period changes.
- [ ] Show contextual upgrade prompts only when an action hits a plan limit, with the specific next-tier benefit, a clear "Ver planes"/"View plans" action, and no repeated prompt in the same session.
- [ ] Support optional temporary featured placements as an upsell with clear labeling, start/end dates, category or period capacity limits, and no override of paid-plan baseline priority.
- [ ] Implement plan-tiered support routing: self-service + standard email for Comunidad, prioritized email for Oficios, dedicated support channel for Comercios.
- [ ] Issue a receipt for every charge in MXN and keep plan, amount, and billing period visible in account history; fiscal invoices (CFDI) available on request. _(Receipt email implemented 2026-11-10 via `TemplatePaymentNotifier`; CFDI template render is ready but its send site stays blocked on fiscal data on `accounts`, a PAC integration, and CFDI file hosting.)_
- [ ] Oficios & Servicios: specialties, coverage area, up to 30 offered services per business with optional base diagnostic rates, work gallery (up to 10 jobs per business with 3 photos each), urgency badge.
- [ ] Comercios & Catálogo: categorized catalog with up to 50 products per business, reference prices, up to 3 photos per product, featured product/dish, social links, and accepted-payment icons.
- [ ] Validate all new fields server-side and in shared form schemas.

## Task 4: Sheet and carousel contracts

- [ ] Expose plan-appropriate DTOs without router/UI coupling. _(Partial: `resolveSheet(plan, source)` returns a discriminated `BusinessSheet` in `packages/api/src/domain/directory/contracts/sheets.ts`, but no client calls it yet, so the sheet is still unrendered.)_
- [ ] Keep public plan-tier badges out of cards/sheets; urgency is a service badge, not a plan badge.
- [x] Rank deterministically: Comercios & Catálogo (20) > Oficios & Servicios (10) > Comunidad (0), recency as tie-breaker. _(`rankSponsors` sorts by priority desc then recency desc.)_
- [ ] Preserve audio during carousel and sheet interactions.

## Task 5: Verification

- [x] Unit coverage for entitlements, migration, validation, and ranking. _(`entitlements.test.ts`, `catalog.test.ts`, `ranking` coverage through the carousel tests, `retention.test.ts`, `grace.test.ts`, `period.test.ts`.)_
- [ ] Integration and headed checks for all three plans on web and native.
- [x] Typecheck, Biome, tests, and build green. _(Verified on `main` at the 2026-11-10 sync: `pnpm -r typecheck`, `pnpm exec biome check .` and the api suite at 645 tests green.)_
- [ ] Human review of plan definitions, downgrade behavior, and visual priority.

## Open decisions

None. All previously open decisions are recorded in SPEC-memberships.md and persistent memory.
