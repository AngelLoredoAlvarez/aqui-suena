# Feature: Conekta payments (one-off charges with a local renewal scheduler)

Objective: a verified owner can pay a paid plan with card, cash (Conekta Efectivo) or SPEI, and the
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
  endpoints. Card, cash (Conekta Efectivo) and SPEI are supported. Acceptance: no Conekta
  subscription call exists, and every period is identifiable by
  `period_start`/`period_end` and a unique idempotency key.
- **S3 — Checkout surface.** `billing.checkout.create` is a protected mutation
  with `{ planId, interval: "monthly" | "annual", method: "card" | "cash" |
  "spei", cardToken?, idempotencyKey }`. The card number and CVV never reach the
  server: the client tokenizes with the Conekta public key and sends the
  one-use token. The response is `{ paymentId, status, nextActionUrl?,
  reference?, expiresAt? }`. `billing.payments.get({ id })` returns the same
  status and payload for the owning account. A third parameter of the plan
  (annual) selects the annual price. Acceptance: one open intent per
  account + plan + interval + method, a new checkout for a different plan is
  rejected while a payment for another plan is pending (expired pending
  payments do not block), a repeated idempotency key returns the existing
  intent, foreign intents answer `NOT_FOUND`, and an unconfigured provider
  answers `503 SERVICE_UNAVAILABLE`. The mutation also accepts
  `customerName` and an optional `customerPhone`; the account email is the
  customer email. A card without a token uses the account's saved card, and a
  card with a token creates or refreshes the saved card. The 3DS return URL is
  the configured `EMAIL_APP_URL`, never a client value. A downgrade with paid
  time is rejected and stays scheduled through the existing plan-change rules.
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
  and seven days for cash/SPEI. A saved card is charged automatically; a 3DS
  challenge leaves a pending payment and an email with the link; a decline is
  retried up to three times. Without a saved card, the sweep creates a cash or
  SPEI reference expiring at `endsAt + 7 days`; the method is the last completed
  payment's method, with cash as the default. Deleted accounts are skipped. The
  idempotency key is `sub:<subscriptionId>:<periodStart>:<attempt>`, so repeated
  runs never create a second charge for the same period. At `endsAt` without
  payment the existing `failRenewal` enters grace; at `graceEnd` the existing
  `downgradeExpiredGrace` drops the account to Comunidad and keeps the community
  business cap. Acceptance: a fake
  clock proves no duplicate per period, bounded batches, retry limits and the
  grace/downgrade handoff.
- **S8 — Data model.** `subscriptions` gains `billing_interval`; `payments` gains
  `account_id`, a nullable `subscription_id`, interval, method, provider, provider
  order/charge ids, a unique idempotency key, reference, next action URL, expiry,
  failure reason and the purchased period; `payment_events` stores the provider
  event id, type, payment id, payload hash, livemode and processing time; `accounts`
  stores the Conekta customer, the default card source and its brand, last four
  and expiry. Migration `0006` rebuilds `payments` and backfills legacy rows from
  their subscription's `account_id`. Account deletion clears the saved card
  columns locally; deleting the Conekta customer at the provider is tracked in
  the backlog. Acceptance: schema tests cover every column,
  the migration drift check is clean, and the staging row count is checked before
  applying.
- **S9 — Emails.** A completed payment sends the receipt (template 7) with plan,
  amount, period and method. A pending cash/SPEI payment sends the reference or
  CLABE and its expiry; add a template if none exists. Renewal reminders use the
  existing service and the persisted `renewalRemindersEnabled` preference, which
  defaults to true. A delivery failure is logged and never fails the payment
  request. The
  cron invokes the reminder service for active subscriptions ending within seven
  days, skips deleted accounts, and a persistent log prevents duplicate
  reminders. Acceptance: template tests cover both languages and a deleted
  account is never emailed.
- **S10 — CFDI.** An invoice is issued only for a completed payment, uses the paid
  amount, plan and interval, and records `payment_id`. The CFDI is `PUE` with the
  real payment form (`04` credit card, `28` debit card, `01` cash, `03` transfer)
  once the payment is linked; the gross breakdown stays subtotal + IVA = total.
  Acceptance: a paid invoice carries the payment id and the correct total, and a
  request without a completed payment is rejected.
- **S11 — Configuration.** `CONEKTA_PRIVATE_KEY`, `CONEKTA_PUBLIC_KEY`,
  `CONEKTA_WEBHOOK_PUBLIC_KEY`, `CONEKTA_LIVEMODE` and `CONEKTA_BASE_URL` are
  read from the environment; the private key and the webhook public key live in
  Infisical and as Worker secrets. `CONEKTA_LIVEMODE` declares the expected event
  mode (false for test keys, true for production). `POST /webhooks/conekta` is
  registered on the app and answers `503` when no handler is configured. The
  webhook URL is registered per environment in the Conekta panel. Without the
  private key, checkout answers `503`. Secrets are never written to the
  repository or logged. Acceptance: env parsing tests, unconfigured responses,
  and a documented staging registration.
- **S12 — Verification.** Unit tests cover the domain with a fake provider and
  clock; the webhook with signed fixtures; the adapter with a mocked `fetch`; the
  database with real SQLite (migration, CAS, unique keys). The sandbox probe
  covers an approved card, a declined card, a 3DS challenge, cash and SPEI
  simulation, expiry, and cleanup of rows, objects and test users. The full gate
  is `pnpm test`, `pnpm typecheck`, `biome check` and `pnpm arch`.
- **S13 — Out of scope.** Signup and the owner portal UI, refunds and chargeback
  automation, multiple cards per account, coupons, proration, automatic invoice
  issuance, production keys, Conekta subscriptions, and the mobile store release
  of the payment flow. Assumptions: one saved card per account, API-level staging
  proof with an existing Supabase test user, and `renewalRemindersEnabled`
  defaulting to true until the preference is persisted.

## Tasks

- **T1** — Feature document (S1–S13). Route: inline. DONE 2026-11-19; merged
  in PR #68.
- **T2** — Schema and migration: interval, payments, payment events, saved card
  columns, schema tests and `0006`. Route: inline. Risk: item 1 (migration).
  DONE 2026-11-19; merged in PR #68.
- **T3** — Domain payment use cases and state machine, with fake provider and
  clock (S4). Replaces the unwired `D1PaymentRepository`, which targeted the old
  payment columns. Route: inline. DONE 2026-11-19; merged in PR #68.
- **T4** — Subscription interval generalization, `renew`, the
  `PaymentSubscriptionWriter` adapter and regression tests (S6). Route: inline.
  DONE 2026-11-19; merged in PR #68.
- **T5** — Conekta adapter: orders for card/cash/SPEI, customer and card source,
  order lookup, error mapping (S2, S3). Extends the provider port with
  `createCardSource`, `CardSource` and `CardDetails`. Route: inline. DONE
  2026-11-19; merged in PR #68.
- **T6** — Webhook: RSA verification, dedupe, livemode and amount checks, Hono
  route (S5). Route: inline. Risk: item 2 (credentials and guards). DONE
  2026-11-19; merged in PR #68.
- **T7** — tRPC checkout and payment status, Worker composition and env wiring
  (S3, S11). Wires the Conekta webhook handler, saves the Conekta customer and
  card source on the account, uses `EMAIL_APP_URL` as the 3DS return URL and
  persists the card metadata from `CardSource.card`. The local Node server has
  no D1 and keeps payments unconfigured. Route: inline. DONE 2026-11-19;
  merged in PR #68.
- **T8** — Scheduler sweeps and grace/downgrade handoff (S7). Route: inline.
  DONE 2026-11-19; merged in PR #68.
- **T9** — Emails and payment-linked CFDI (S9, S10). Route: inline. DONE
  2026-11-19; merged in PR #68.
- **T10** — Staging proof, cleanup and catalog re-seed (S12). Route: inline.
  Migration `0006` applied, Worker deployed, catalog seeded, webhook registered.
  Real sandbox proof: 3DS frictionless, 3DS challenge, declined card, saved-card
  decline, SPEI paid and SPEI expiry through the cron, and cash/efectivo paid
  end-to-end with the current `cash` provider. Emails delivered. DONE
  2026-11-19; merged in PR #68.

## Log

- 2026-11-19: pricing closed at `$99/$149` with IVA included; the catalog and the
  CFDI gross breakdown are implemented and tested.
- 2026-11-19: payment model decided as one-off Conekta charges with a local
  scheduler; card, cash (Conekta Efectivo) and SPEI; no Conekta subscriptions.
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
- 2026-11-19: T4 moves the billing interval to a neutral module, adds
  `addInterval`, records the interval on subscriptions and the D1 repository,
  adds `SubscriptionService.renew` and the `SubscriptionPaymentWriter` adapter.
  Verification: billing tests 299/299, API suite 1029/1029, typecheck 7/7,
  biome clean, arch 402 modules. Uncommitted pending review.
- 2026-11-19: T5 adds `ConektaPaymentProvider`: orders for card (token or saved
  source), cash and SPEI, 3DS `next_action`, order lookup, customer/card-source
  creation and provider error mapping. The provider port gains
  `createCardSource`, `CardSource` and `CardDetails`; the fake implements it.
  Verification: adapter 14/14, API suite 1043/1043, typecheck 7/7, biome clean.
  Uncommitted pending review.
- 2026-11-19: T6 adds the Conekta webhook: RSA-SHA256 `DIGEST` verification with
  the generated public key, the `payment_events` repository and D1 adapter,
  dedupe by event id with retry of unprocessed events, livemode/amount/currency
  guards, `order.paid`/`charge.paid` completion, `order.expired` expiry,
  `charge.declined` failure, and no-op recording for refunds and chargebacks.
  The app registers `POST /webhooks/conekta` and answers 503 without a handler;
  Worker/Node wiring is T7. `.env.schema` declares `CONEKTA_WEBHOOK_PUBLIC_KEY`
  and `CONEKTA_LIVEMODE`. Verification: webhook tests 29/29, API suite
  1072/1072, typecheck 7/7, biome clean, arch 414 modules. Uncommitted pending
  review.
- 2026-11-19: T7 adds the checkout service (period and upgrade rules, saved card
  fallback, `EMAIL_APP_URL` 3DS return), the card-source save inside
  `PaymentService.create`, account card storage and clearing on deletion,
  `billing.checkout.create` and `billing.payments.get`, and the Worker
  composition (Conekta provider, payment service, sandbox/livemode vars, webhook
  handler). Verification: API suite 1097/1097, typecheck 7/7, biome clean,
  arch 417 modules. Uncommitted pending review.
- 2026-11-19: T8 adds the scheduled payment sweeps: refresh pending orders
  (paid/declined/expired), renew due subscriptions (saved card or the last
  completed method, 3/7-day lead, three card attempts, idempotency key with the
  attempt number), enter grace at `endsAt`, downgrade expired grace keeping the
  community business cap, and skip deleted accounts. The Worker scheduled
  handler runs cancellation and payments independently. Verification: API suite
  1113/1113, typecheck 7/7, biome clean, arch 421 modules, wrangler dry-run.
  Uncommitted pending review.
- 2026-11-19: T9 wires payment emails and turns the CFDI into a payment document.
  `PaymentService` sends the receipt after a completed charge and pending
  instructions (reference, expiry or 3DS link) right after a pending charge,
  skipping deleted accounts and logging delivery failures without failing the
  request. Template 7 gains the payment method row; template 12
  `payment-pending` is new in both locales. `IssueInvoice` now invoices the
  latest completed payment: it rejects an account without one, uses the paid
  amount, plan and interval, stamps `payment_id` on issued and failed rows, and
  sends `PUE` with the SAT form (`04` card, `01` cash (Conekta Efectivo), `03` SPEI). The invoice
  composition builds the payment repository from D1 and no longer reads the
  active subscription. Verification: API suite 1122/1122, all-package
  typecheck 7/7, biome clean, arch 421 modules. Uncommitted pending review.

- 2026-11-19: T9 committed as `cf52a74` (T9 emails + payment-linked CFDI).
- 2026-11-19: T10 staging proof. `deploy:api` applied migration `0006`
  (bookmark `000000a6-00000000-00005128-750cbca976f4f244a852422fab4134b2`) and
  deployed versions `bfd429e8`, `4c128b52`, `ec26cc7c` and `83ee6498`; the plan
  catalog re-seeded 3 rows (`trades` 9900/99000, `commerce` 14900/149000).
  Webhook `6aff7e575fd7bd00372f459a` is active and `listening` with
  `order.paid`, `charge.paid`, `order.expired`, `charge.declined`,
  `order.refunded`, `charge.refunded` and `order.charged_back`.
- 2026-11-19: T10 real sandbox results. Card `4000000000002701` (frictionless
  approved) completed and activated `commerce`; `4000000000001091` (challenge)
  completed with OTP `1234` and renewed `trades`; `4000000000002925`
  (frictionless rejected) failed with the provider reason and `charge.declined`;
  saved card `5288512905315970` declined with a `200` and a failed payment.
  SPEI reference `646180111812345678` paid through
  `/sandbox/spei/payment_notifications`; `order.paid` and `charge.paid` arrived
  and completed the payment. A canceled SPEI order expired through the
  fifteen-minute scheduler. Resend reports every receipt and pending email as
  `delivered`.
- 2026-11-19: T10 found and fixed two defects. Concurrent `order.paid` and
  `charge.paid` events both activated a subscription; `complete` now claims the
  payment before activating, with a concurrency test. A card decline answered
  by Conekta with `402` surfaced as a `500`; the adapter now maps card `402`
  responses to a declined charge, so checkout returns a failed payment with the
  provider reason. Canceled and voided orders now map to `expired` so the
  refresh sweep can close them. Verification after the fixes: API suite
  1127/1127, typecheck 7/7, biome clean, arch 421 modules.
- 2026-11-19: T10 cleanup verified: zero accounts, payments, subscriptions,
  payment events and CFDI rows; the 3 seeded plans remain; both probe users were
  deleted. OXXO cannot be probed: Conekta answers
  `conekta.errors.parameter_validation.order.provider_not_found` for
  `oxxo_cash` (HTTP 422) because the sandbox merchant has no OXXO provider.
  Superseded by the next entry: the old type was deprecated, not a missing
  provider.

- 2026-11-19: The OXXO blocker was the old type, not a missing provider.
  Conekta rebranded OXXO Pay as Conekta Efectivo and now accepts
  `payment_method.type = "cash"`; `oxxo_cash` answers `422 provider_not_found`.
  The adapter now sends `cash` for the cash method (test updated). Deployed
  version `1de76226`. A real checkout produced reference
  `10001109036270656606`; the sandbox auto-paid the order after about thirty
  seconds, `order.paid` and `charge.paid` completed the payment, activated
  `trades`, and Resend delivered both the pending and receipt emails. The
  product label still said "OXXO" at that point; the follow-up switched it to
  "Efectivo". Verification after the change: API suite 1127/1127,
  typecheck 7/7, biome clean, arch 421 modules.

- 2026-11-19: The RDD review found a blocker in the T10 completion reorder: a
  claimed payment whose activation failed stayed completed without a
  subscription, and a provider retry could not repair it. `complete` now
  releases the claim when activation or attachment throws, and a completed
  payment without a subscription is repaired by a later retry after a
  five-minute window. Tests cover the release path, the delayed repair and the
  D1 release query. The native review could not finish: the OpenCode transport
  refused the refuter capture (`no Go-owned role capture contract`), so the
  review authority remains non-terminal and no approval is claimed.

- 2026-11-19: the cash method is now `cash` end to end. The user-facing copy
  says "Efectivo" (es-MX) and "Cash" (en); the domain method, API picklist, DB
  enum, provider mapping, tests and docs use `cash`. Migration
  `0007_cash_payment_method.sql` backfills existing `oxxo` rows to `cash`.
  Historical log entries keep the old provider name only to explain the
  rebrand.

- 2026-11-19: T1–T10 merged in PR #68 (`1bd53bd`); the `deploy-api` workflow
  deployed staging and applied `0006`. The cash method rename merged in PR #69
  (`af37e72`); `deploy-api` applied `0007`, and the staging smoke passed for
  `cash` and SPEI with Efectivo/Cash emails. The native review successor remains
  non-terminal; no approval is claimed.

- 2026-11-19: checkout now rejects a new plan while a payment for another plan
  is pending; same-plan checkouts remain allowed and expired pending payments
  are ignored.

- 2026-11-19: renewal reminders are wired to the fifteen-minute cron through
  `ProcessRenewalReminders` and the D1 `subscription_reminders` log (migration
  `0008`). The sweep processes up to five active subscriptions ending within
  seven days, skips deleted accounts and uses the existing
  `RenewalReminderService`; `renewalRemindersEnabled` stays true until the
  preference is persisted.

- 2026-11-19: `accounts.renewal_reminders_enabled` persists the owner preference
  (migration `0009`). `account.getPreferences` and `account.updatePreferences`
  expose it, and the cron passes the account flag to the reminder service.
