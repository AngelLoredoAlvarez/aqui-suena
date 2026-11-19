# Feature: Conekta payments (one-off charges with a local renewal scheduler)

Objective: a verified owner can pay a paid plan with card, OXXO or SPEI, and the
subscription activates or renews only when Conekta confirms the charge. Each
period is charged on demand by our own scheduler; D1 remains the source of
truth. Branch `feat/conekta-payments`; delivery in work-unit commits and pull
request slices; runner `pnpm --filter @aqui-suena/api test` plus `pnpm test` for
the full gate. Commits only on explicit instruction.

## Specs

- **S1 — Prices and billing basis.** Comunidad stays free. Oficios & Servicios
  costs `$99 MXN/month` or `$990 MXN/year`; Comercios & Catálogo costs
  `$149 MXN/month` or `$1,490 MXN/year`. Prices are final consumer prices with
  IVA included; the CFDI breaks the gross amount down as subtotal + IVA (16%)
  so the stamped total equals the amount charged. Annual billing is 10 months
  paid for 12. Acceptance: `DEFAULT_PLAN_CATALOG` serves `9900`/`99000` and
  `14900`/`149000` cents, the CFDI payload total equals the plan price, and
  tests pin both.
- **S2 — One-off charges, local scheduler.** Every billing period is a separate
  payment intent. The project never calls Conekta subscription or recurring
  endpoints. Card, OXXO and SPEI are supported. Acceptance: no Conekta
  subscription call exists, and every period is identifiable by
  `period_start`/`period_end` and a unique idempotency key.
- **S3 — Checkout surface.** `billing.checkout.create` is a protected mutation
  with `{ planId, interval: "monthly" | "annual", method: "card" | "oxxo" |
  "spei", cardToken?, idempotencyKey }`. The card number and CVV never reach the
  server: the client tokenizes with the Conekta public key and sends the
  one-use token. The response is `{ paymentId, status, nextActionUrl?,
  reference?, expiresAt? }`. `billing.payments.get({ id })` returns the same
  status and payload for the owning account. A third parameter of the plan
  (annual) selects the annual price. Acceptance: one open intent per
  account + plan + interval + method, a repeated idempotency key returns the
  existing intent, foreign intents answer `NOT_FOUND`, and an unconfigured
  provider answers `503 SERVICE_UNAVAILABLE`.
- **S4 — Payment state machine.** Statuses are `pending`, `completed`, `failed`,
  `expired` and `refunded`. Only `pending` can move to `completed`, `failed` or
  `expired`; `refunded` is reserved for provider records and never auto-downgrades
  in V1. The transition is a compare-and-set (`UPDATE ... WHERE status =
  'pending'`), so a webhook and a synchronous card answer cannot both activate
  the subscription. The subscription writer is idempotent by payment id, so a
  concurrent duplicate cannot extend the period twice. Acceptance: duplicate
  completion is a no-op, an invalid transition changes nothing, and the
  subscription is activated or extended exactly once.
- **S5 — Webhook.** `POST /webhooks/conekta` reads the raw body, verifies the
  `DIGEST` header as an RSA-SHA256 signature with `CONEKTA_WEBHOOK_PUBLIC_KEY`
  through WebCrypto, and rejects an invalid signature with `401`. It deduplicates
  by `event.id` in `payment_events`, validates `livemode` against the
  environment, and checks amount and currency against the local row. Relevant
  events are `order.paid`, `order.expired` and `charge.declined`; refunds and
  chargebacks are recorded without automatic downgrade. The endpoint answers
  `200` only after the state is persisted and `500` on a transient failure so
  Conekta retries. Acceptance: signed fixtures pass, invalid signatures and
  livemode mismatches are rejected, a replayed event is a no-op, and an amount
  mismatch is rejected.
- **S6 — Subscriptions with interval.** `subscriptions.billing_interval` is
  `monthly` or `annual`. Period math uses `addMonths` or `addYears`; paid time is
  never lost: a renewal extends from `endsAt`, an upgrade still chains from the
  paid end, and a downgrade stays scheduled for the end of the paid period. The
  seven-day grace and the automatic downgrade keep their current behavior.
  Acceptance: monthly and annual periods clamp correctly, renewal extends from
  the paid end, and grace/downgrade regressions stay green.
- **S7 — Scheduler.** The existing fifteen-minute cron gains two bounded sweeps.
  Refresh: up to five `pending` payments with a provider order are queried and
  completed or expired. Renew: up to five active paid subscriptions ending within
  the lead window get a payment for the next period. Lead is three days for card
  and seven days for OXXO/SPEI. A saved card is charged automatically; a 3DS
  challenge leaves a pending payment and an email with the link; a decline is
  retried up to three times. Without a saved card, the sweep creates an OXXO or
  SPEI reference expiring at `endsAt + 7 days` and emails the instructions. The
  idempotency key is `sub:<subscriptionId>:<periodStart>`, so repeated runs never
  create a second charge for the same period. At `endsAt` without payment the
  existing `failRenewal` enters grace; at `graceEnd` the existing
  `downgradeExpiredGrace` drops the account to Comunidad. Acceptance: a fake
  clock proves no duplicate per period, bounded batches, retry limits and the
  grace/downgrade handoff.
- **S8 — Data model.** `subscriptions` gains `billing_interval`; `payments` gains
  `account_id`, a nullable `subscription_id`, interval, method, provider, provider
  order/charge ids, a unique idempotency key, reference, next action URL, expiry,
  failure reason and the purchased period; `payment_events` stores the provider
  event id, type, payment id, payload hash, livemode and processing time; `accounts`
  stores the Conekta customer, the default card source and its brand, last four
  and expiry. Migration `0006` rebuilds `payments` and backfills legacy rows from
  their subscription's `account_id`. Acceptance: schema tests cover every column,
  the migration drift check is clean, and the staging row count is checked before
  applying.
- **S9 — Emails.** A completed payment sends the receipt (template 7) with plan,
  amount, period and method. A pending OXXO/SPEI payment sends the reference or
  CLABE and its expiry; add a template if none exists. Renewal reminders use the
  existing service; until the preference is persisted, every paid owner receives
  them. A delivery failure is logged and never fails the payment request.
  Acceptance: template tests cover both languages and a deleted account is never
  emailed.
- **S10 — CFDI.** An invoice is issued only for a completed payment, uses the paid
  amount, plan and interval, and records `payment_id`. The CFDI is `PUE` with the
  real payment form (`04` credit card, `28` debit card, `01` cash, `03` transfer)
  once the payment is linked; the gross breakdown stays subtotal + IVA = total.
  Acceptance: a paid invoice carries the payment id and the correct total, and a
  request without a completed payment is rejected.
- **S11 — Configuration.** `CONEKTA_PRIVATE_KEY`, `CONEKTA_PUBLIC_KEY`,
  `CONEKTA_WEBHOOK_PUBLIC_KEY` and `CONEKTA_BASE_URL` are read from the
  environment; the private key and the webhook public key live in Infisical and
  as Worker secrets. The webhook URL is registered per environment in the Conekta
  panel. Without the private key, checkout and webhook answer `503`. Secrets are
  never written to the repository or logged. Acceptance: env parsing tests,
  unconfigured responses, and a documented staging registration.
- **S12 — Verification.** Unit tests cover the domain with a fake provider and
  clock; the webhook with signed fixtures; the adapter with a mocked `fetch`; the
  database with real SQLite (migration, CAS, unique keys). The sandbox probe
  covers an approved card, a declined card, a 3DS challenge, OXXO and SPEI
  simulation, expiry, and cleanup of rows, objects and test users. The full gate
  is `pnpm test`, `pnpm typecheck`, `biome check` and `pnpm arch`.
- **S13 — Out of scope.** Signup and the owner portal UI, refunds and chargeback
  automation, multiple cards per account, coupons, proration, automatic invoice
  issuance, production keys, Conekta subscriptions, and the mobile store release
  of the payment flow. Assumptions: one saved card per account, API-level staging
  proof with an existing Supabase test user, and `renewalRemindersEnabled`
  defaulting to true until the preference is persisted.

## Tasks

- **T1** — Feature document (S1–S13). Route: inline. DONE 2026-11-19.
- **T2** — Schema and migration: interval, payments, payment events, saved card
  columns, schema tests and `0006`. Route: inline. Risk: item 1 (migration).
  DONE 2026-11-19 (pending review).
- **T3** — Domain payment use cases and state machine, with fake provider and
  clock (S4). Replaces the unwired `D1PaymentRepository`, which targeted the old
  payment columns. Route: inline. DONE 2026-11-19 (pending review).
- **T4** — Subscription interval generalization, `renew`, the
  `PaymentSubscriptionWriter` adapter and regression tests (S6). Route: inline.
- **T5** — Conekta adapter: orders for card/OXXO/SPEI, customer and card source,
  order lookup, error mapping (S2, S3). Route: inline.
- **T6** — Webhook: RSA verification, dedupe, livemode and amount checks, Hono
  route (S5). Route: inline. Risk: item 2 (credentials and guards).
- **T7** — tRPC checkout and payment status, composition and env wiring
  (S3, S11). Route: inline.
- **T8** — Scheduler sweeps and grace/downgrade handoff (S7). Route: inline.
- **T9** — Emails and payment-linked CFDI (S9, S10). Route: inline.
- **T10** — Staging proof, cleanup and catalog re-seed (S12). Route: inline.

## Log

- 2026-11-19: pricing closed at `$99/$149` with IVA included; the catalog and the
  CFDI gross breakdown are implemented and tested.
- 2026-11-19: payment model decided as one-off Conekta charges with a local
  scheduler; card, OXXO and SPEI; no Conekta subscriptions.
- 2026-11-19: Conekta test keys stored in Infisical (`dev`, `staging`) and as
  staging Worker secrets; `.env.schema` declares both keys.
- 2026-11-19: T1 written. T2 adds the schema and migration `0006`; verified
  against a real SQLite database with a legacy payment row: `account_id` is
  backfilled from the subscription, legacy rows get `method = 'card'`,
  `provider = 'conekta'`, `billing_interval = 'monthly'` and
  `idempotency_key = 'legacy-<id>'`, and both unique indexes are present. T1 and
  T2 are committed as `afcf2ea` and `341f91d`.
- 2026-11-19: T3 replaces the payment entity and repository with the intent
  model, adds the provider and subscription-writer ports, the payment service
  with create/complete/fail/expire and compare-and-set transitions, the fake
  provider and writer, and the D1 adapter. RED on the missing service, then
  GREEN: payments tests 70/70, API suite 1006/1006, typecheck 7/7, biome clean,
  arch 398 modules. Uncommitted pending review.
