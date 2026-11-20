# Spec: memberships — Aquí Suena (by 17Labs)

> **Status: partial (2026-11-16).** Plan catalog, entitlements, subscription lifecycle, grace period, retention and carousel priority are implemented in `packages/api`; the plan-selection and billing views are not built.

## Objective

Three business plans for Aquí Suena owners, billed by 17Labs: **Comunidad** (free), **Oficios & Servicios** (paid, intermediate), and **Comercios & Catálogo** (paid, top). Radio playback remains independent from business monetization: plan visibility and monetization happen through the visual ads carousel and business directory. Owners subscribe in owner-portal; enforcement applies in business-directory and ads-display. Success = plan limits and carousel priority are automatic, with no manual gating.

## Plan definitions

### Comunidad — free

For any person or business that wants basic presence and direct contact.

**Business limit:** 1 business per account.
**Allowed business types:** contacto only.

Card description: advertise a business at no cost and join the regional directory.

Includes:

- Direct contact details: WhatsApp, phone, and address.
- One basic flyer in the visual carousel rotation, replaceable only every 15 days.
- Quick open/closed status indicator.
- Exact-location map button.

Carousel behavior: standard/low community rotation: 1 appearance per cycle.

### Oficios & Servicios — paid intermediate

**Price:** $99 MXN/month or $990 MXN/year.

For service providers of any profession: electricians, plumbers, dentists, lawyers, educators and more.

**Business limit:** 3 businesses per account.
**Allowed business types:** contacto and servicios.

Card description: show professional experience and reach more clients with a profile designed for home-service work.

Includes:

- Universal contact details.
- Higher carousel frequency and visual priority than Comunidad.
- Profile specialties, coverage area, and up to 30 offered services per business with optional base diagnostic rates.
- Gallery of up to 10 previous jobs per business, with up to 3 photos per job.
- "Urgencias / 24 Horas" badge.

Carousel behavior: 2 appearances per cycle, focused on reminders and trust by specialty.

### Comercios & Catálogo — paid top

**Price:** $149 MXN/month or $1,490 MXN/year.

For established businesses that sell products or catalogs: hardware stores, restaurants, boutiques and more.

**Business limit:** 10 businesses per account.
**Allowed business types:** contacto, servicios and catálogo.

Card description: stand out with a complete digital storefront where listeners can explore everything the business sells.

Includes:

- Universal contact details.
- Maximum carousel priority and featured rotation.
- Digital catalog ordered by categories with up to 50 products per business, reference prices, and up to 3 photos per product.
- Featured product/dish.
- Social-media links.
- Icons for accepted payment methods.
- Push campaigns: compose and send a message to listeners (`SPEC-notifications.md`).
- Audio spots: the only tier eligible for recorded spots (`SPEC-radio-spots.md`), switched on when the plan launches.

Carousel behavior: 3 appearances per cycle, focused on visual impact and category-based catalog exploration.

## Tech Stack

- Web: React + Next.js (App Router) + React Native Web
- Native: React Native + Expo (managed, owners mostly on web)
- Navigation: TBD — `/owner/billing`. `packages/navigation` reserved; no Solito installed.
- UI: Tamagui (three plan cards, current-plan badge)
- Data: tRPC + TanStack Query, Conekta for subscriptions (cards/cash/SPEI, MXN)
- DB: Drizzle + D1/SQLite (`plans`, `subscriptions` with `grace_end`, `payments`, `businesses` with `hidden_at`/`retained_until`); entitlements are domain data, not a table. Public business and child lists filter `hidden_at IS NULL`; owner-scoped reads keep hidden businesses visible. Deleting a business cascades to its directory children.
- Email: Resend (transactional email, free tier) for grace-period, renewal, downgrade, cancellation, verification, welcome and receipt emails; wired through an `EmailSender` port so the provider stays swappable. Templates (11, es-MX/en) are rendered by `packages/api/src/infrastructure/email/renderer.ts`; the design artifacts live in `packages/api/design/email-templates/`. The rendered templates and the domain notifiers exist, and `ResendEmailSender` plus the subscription notifier are instantiated in `packages/api/src/server/composition/email.ts` and wired through `createApp`/`createAppRouter`; `subscriptions.cancel`, `billing.requestInvoice`, payment pending/receipt, the renewal-reminder sweep and the subscription-lifecycle notices (renewal failed, grace expired, plan downgrade) are live. The account welcome and verification emails remain pending on signup (see `odd/tasks/backlog.md`, "Production wiring pending").
- Language: TypeScript strict
- Lint/format: Biome (replaces ESLint + Prettier)

## Commands

```
Dev web: pnpm --filter web dev
Build: pnpm -r build
Test: pnpm -r test -- --run
Lint: pnpm exec biome check --write .
Typecheck: pnpm -r typecheck
DB migrations: pnpm --filter @aqui-suena/db db:generate, then pnpm --filter @aqui-suena/api exec wrangler d1 migrations apply <db> --remote
```

## Project Structure

```
packages/db/src/schema.ts                 → plans, subscriptions, payments tables
packages/api/src/server/routers/plans/plans.ts  → plans.list (tRPC)
packages/api/src/domain/plans/            → plan catalog and entitlements (shared kernel)
packages/api/src/domain/billing/          → subscriptions, grace window, payments domain logic
packages/api/src/infrastructure/plans/    → D1 plan repository
packages/api/src/infrastructure/billing/  → D1 repositories (subscription, payment, invoice)
packages/ui/src/plan-card.tsx             → three-plan comparison + current-plan badge (planned)
apps/web/app/owner/billing/page.tsx       → billing route (web-first, planned)
```

## Code Style

Entitlements as data, not conditionals scattered in UI:

```tsx
// Rotation frequency: Comunidad 1, Oficios 2, Comercios 3 appearances per cycle.
export const ENTITLEMENTS = {
  comunidad: {
    maxBusinesses: 1, // Comunidad only; Oficios = 3; Comercios = 10
    flyerImages: 1,
    catalog: false,
    carouselPriority: 0,
  },
  oficios: {
    specialties: true,
    coverageArea: true,
    workGallery: true,
    urgencyBadge: true,
    diagnosticRates: true,
    carouselPriority: 10,
  },
  comercios: {
    catalog: true,
    catalogCategories: true,
    featuredProduct: true,
    socialLinks: true,
    paymentMethods: true,
    carouselPriority: 20,
  },
} as const;
export type PlanId = keyof typeof ENTITLEMENTS;
```

Conventions: single `entitlements.get(accountId)` resolver per account consumed by directory and ads; never re-implement limits per screen. Plan IDs are stable lowercase keys; display names and card copy come from the i18n dictionary.

## Testing Strategy

- Framework: Vitest; integration via tRPC caller.
- Locations: `packages/api/src/domain/{plans,billing}/*.test.ts`, `packages/api/src/infrastructure/{plans,billing}/*.test.ts`, `packages/api/src/server/routers/plans/plans.test.ts`.
- Coverage: 100% on entitlement matrix and downgrade/upgrade transitions across all three plans.
- Levels: unit (limits per plan) → integration (subscription change propagates to listing and carousel within 1 min).

## Boundaries

- Always: enforce limits server-side, show an upgrade CTA when a plan limit is hit, audit plan changes.
- Always: store `termsAcceptedVersion + termsAcceptedAt` per Account from signup acceptance and link the same terms from plan/billing screens; copy via i18n dictionary, no hardcoded strings.
- Always: require an unchecked-by-default recurring-charge authorization checkbox on every paid signup and plan change (`/owner/billing`) disclosing amount, frequency, currency, no trial, automatic renewal, the 7-day failed-renewal grace with email warning, and how to cancel; `subscriptions.create` and plan-change mutations reject without it; store `subscriptionAcceptedVersion + subscriptionAcceptedAt` per Account and always issue a receipt; copy via i18n dictionary, no hardcoded strings.
- Always: gate plan changes (including downgrade picker) behind explicit user confirmation listing affected limits/items with destructive defaults off; copy via i18n dictionary, no hardcoded strings.
- Always: extend the append-only activity audit log (actor, action, entity, timestamp) to plan changes and recurring-charge authorizations and surface them in the visible activity section; log is immutable and never user-editable.
- Ask first: change prices/limits, switch payment provider, grant manual exceptions, change ranking weights.
- Never: enforce limits only in UI, allow Comunidad listings to claim paid carousel priority, render a plan-tier badge in the public directory card or sheet (carousel priority is applied silently in ranking), or allow more than one active subscription per account. The Oficios "Urgencias / 24 Horas" badge is a service attribute, not a plan-tier badge.

## Success Criteria

- Comunidad's single flyer can be replaced only after 15 days; attempts return a typed `FLYER_REPLACEMENT_COOLDOWN` error with the next allowed replacement date. Paid plans have no flyer replacement cooldown.
- Oficios & Servicios: specialties, coverage area, up to 30 offered services with optional base diagnostic rates, previous-work gallery (up to 10 jobs with 3 photos each), urgency badge, and base diagnostic rates; higher carousel priority than Comunidad; 3 businesses per account.
- Comercios & Catálogo: categorized catalog with up to 50 products, reference prices, up to 3 photos per product, featured product/dish, social links, and accepted-payment icons; highest carousel priority; 10 businesses per account.
- Ranking is deterministic: Comercios & Catálogo (20) > Oficios & Servicios (10) > Comunidad (0), with recency as tie-breaker. Frequency is 1/2/3 appearances per cycle respectively; selection interleaves businesses to avoid consecutive repeats while respecting each plan's allocated appearances.
- Subscription periods are computed in UTC calendar months with the day clamped to the target month's last day: `2026-01-31 + 1 month = 2026-02-28` (or February 29 in a leap year), never March 3. Persisted `ends_at` values therefore stay inside the intended month.
- Downgrade (manual, or automatic after the 7-day failed-renewal grace with email warning) applies limits within 1 minute without data loss (excess content hidden, not deleted); hidden content is retained for 90 days before permanent deletion. Plan changes are immediate on upgrade and scheduled for the end of the paid period on downgrade; V1 does not prorate charges. Cancellation stops renewal but keeps the paid plan active until the end of the billing period; V1 does not issue partial refunds for unused time. Cancelling during the failed-renewal grace period ends access immediately (there is no remaining paid period to keep) and notifies the customer with the immediate-cancellation email. Failed renewals use the 7-day grace period with email warning before downgrade.
- Paid time is never lost. While an account still has paid time left (an `active` period, or a `cancelled` one whose `ends_at` is in the future), a new period starts where the paid one ends instead of restarting at `now`: re-subscribing to the same plan resumes the cancelled subscription and extends `ends_at` by one period, and an upgrade takes effect immediately while its `ends_at` is computed from the previous one. A downgrade keeps its existing shape — the lower plan is scheduled at the end of the paid period. Only an account with no paid time left starts a period at `now`. This is not proration: no charge is prorated and no unused time is refunded; it only stops the platform from discarding time the customer already paid for.
- Every paywalled action returns a typed `UPGRADE_REQUIRED` error the UI maps to billing.
- Paid plans are billed in MXN via Conekta with no trial period (Comunidad is the free entry point): Oficios & Servicios costs $99 MXN/month or $990 MXN/year; Comercios & Catálogo costs $149 MXN/month or $1,490 MXN/year. Prices are final consumer prices with IVA included; the CFDI breaks the price down as subtotal + IVA (16%) so the total equals the amount charged. Annual billing is promoted as 10 months paid for 12 months of service.
- Pricing basis (2026-11-19): reviewed against the production stack (~$1,611 MXN/month at 100 paying accounts, card payments, 30% ISR and a 15% reserve). The entry plan covers its share from ~29 paying accounts; the top plan from ~19.
- Each account has at most one active subscription at any time; upgrades and downgrades replace the previous active subscription rather than creating a second active one.
- The previous Premium plan at $159 MXN/month is discontinued; its price is not grandfathered into the new three-plan model. No account migration is required because no accounts are registered yet.
- Plan screens show all three cards with i18n copy. Onboarding asks for `businessProfile` and preselects the corresponding recommendation: local community business → Comunidad, home services/trades → Oficios & Servicios, catalog-based commerce → Comercios & Catálogo. The user can change plans before confirming; an unanswered profile defaults to Comunidad.
- Plan metadata, pricing and entitlements are stored in D1 and exposed through `plans.list()` / `plans.getById()`; `ENTITLEMENTS` remains the technical source of plan limits.
- Audio radio spots belong to Comercios & Catálogo only. Comunidad and Oficios & Servicios never enable them; the flag stays off in every environment until the top tier is live, so `ENTITLEMENTS.commerce.spotEligible` remains `false` until then. Push campaigns follow the same rule: receiving notifications is universal, composing and sending them is a Comercios & Catálogo entitlement (`SPEC-notifications.md`). Media uploads follow the same entitlement data: avatars are account-level for every plan, every tier includes flyers, product photos require the full media tier (paid plans), and audio spots require the spot entitlement. Keys, ownership checks and confirm rules live in `SPEC-media-storage.md`.
- There is no 17 Labs admin panel: operational changes run through the token-guarded `/admin/*` endpoints in `packages/api`. The retired panel analysis lives in `docs/archive/SPEC-admin-panel.md`.
- Support is plan-tiered: Comunidad uses self-service help plus standard email support; Oficios & Servicios gets prioritized email support; Comercios & Catálogo gets a dedicated support channel for catalog, payment, and operational issues.
- Stats availability by tier: Comunidad sees ad impressions, business visits, and basic contact clicks; Oficios & Servicios adds action clicks, gallery views, and service conversions; Comercios & Catálogo adds product views, product clicks, top product, category views, and date-range exports.
- Flyer ownership is business-scoped: every business has exactly one flyer, even when multiple businesses share the same account. The account controls permissions and billing only; public data always belongs to the business.
- Featured placements are an optional temporary upsell, not a replacement for plan priority. They are clearly labeled, time-boxed, capacity-limited, and never remove a paid plan's baseline carousel weight or allocated appearances. Comercios & Catálogo may include preferred featured benefits such as a monthly free featured slot or discounted featured purchases.
- Catalog categories for Comercios & Catálogo are a controlled shared enum with i18n display names; owners cannot create arbitrary categories.
- Plan upgrade prompts are contextual: they appear only when an action hits a plan limit, explain the specific benefit of the next tier, include a clear "Ver planes"/"View plans" action, and do not repeat within the same session.
- Billing issues a receipt for every charge in MXN; fiscal invoices (CFDI) are available on request through `billing.requestInvoice`. Stamping goes through the `InvoiceIssuer` port (`FacturamaInvoiceIssuer`, sandbox today: it produces fiscally valid XML with no legal validity, consumes no folios and never expires), the XML and the provider PDF are archived in R2 through `CfdiDocumentStore`, and every attempt is recorded in `cfdi_invoices` as `issued` or `failed`. The invoice declares `PaymentMethod: PUE` with the payment form derived from the charge method (`payment_id` links the invoice to the charge, and `plan_id` is snapshotted in `payments`). The sandbox stamps through the multiemisor endpoint with the SAT test RFC because the sandbox account RFC cannot carry that CSD; production uses the single-emitter endpoint with the company CSD. Plan, amount, and billing period remain visible in account history. The receipt email (template 7) is implemented by `TemplatePaymentNotifier.paymentReceipt`; the CFDI email (template 8) is delivered by `TemplateCfdiNotifier` with the PDF and the archived XML attached. See `packages/api/design/email-templates/TEMPLATES.md` and `odd/tasks/feat-cfdi-email.md`.
- Cancelling an issued CFDI is out of scope for issuing: the emitter requests cancellation with a SAT motive and the receiver may accept or reject it within 72 hours, so it is an asynchronous state machine (`issued` → `cancellation_pending` → `cancelled` | `cancellation_rejected`). Motive `01` stamps a substitute CFDI first — relation `04` in the payload, replacement UUID recorded in `cfdi_invoices.substitution_uuid` — and then cancels the original with `uuidReplacement`; motives `02` and `03` cancel directly. A failed substitution returns the original to `issued` and never reaches the PAC. Tracked in `odd/tasks/backlog.md`.
- Fiscal data (RFC, legal name, régimen fiscal, fiscal zip code, CFDI use, billing email) belongs to the account and is **only requested from accounts with paid time**. The plan that decides it is the resolved plan (`resolvePlan` over the active subscription), not `accounts.plan_id`, so a cancelled subscription keeps invoicing until its paid period ends and a grace period still invoices. A Comunidad account never sees the request, but may still store its profile (for example while filling the checkout form before paying) because saving data emits nothing. Issuing a CFDI requires a paid plan and answers `UPGRADE_REQUIRED` otherwise; an account without a fiscal profile answers `BAD_REQUEST` before any stamp is attempted. Downgrading to Comunidad stops the request but never deletes the stored profile, and issued invoices stay intact for fiscal retention.
- The billing/pricing page shows three aligned plan cards first, followed by a secondary comparison table grouped by usage, features, visibility, support, stats, and billing.
- The billing page defaults to annual billing with a monthly/annual toggle, highlights the annual savings as "2 meses gratis", and allows changing the billing period before payment.
- The system sends renewal and expiration reminders: 7 days before charge, 1 day before charge, immediately on failed payment, and when a plan downgrades; non-critical reminders can be disabled by the owner.
- Reminder timing counts UTC calendar days, not elapsed 24-hour blocks, so a seven-calendar-day window that crosses a DST transition still fires `renewal_7d`.
- The reminder sweep reads only subscriptions with a reminder due in the current UTC day window: a recorded 7-day reminder removes the subscription from the batch until its 1-day window opens, and deleted accounts plus owners with reminders disabled are excluded in the query. A five-row batch therefore cannot starve subscriptions behind it.
- The reminder log is scoped to the billing period (`period_ends_at`): each period gets its own 7-day and 1-day reminders, and a renewal never inherits the previous period's records.
- Abuse prevention for the free plan requires email verification, phone verification before publishing, duplicate-account detection by email/phone/device, and manual review for suspicious signup patterns.
- Owner onboarding uses an informational, non-blocking checklist: business name/category, phone/WhatsApp, address/hours, flyer upload, open/closed status, and plan-specific services/gallery/catalog steps. Steps are marked automatically and the checklist can be hidden when complete.

## Open Questions

None.
