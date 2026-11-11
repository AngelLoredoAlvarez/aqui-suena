# feat-email-sender-wiring

Status: **done.** Branch `feat/email-sender-wiring`, implemented 2026-11-11 with strict RED→GREEN TDD.

Objective: close the first production email gap — no email is sent today even when `RESEND_API_KEY` is set, because `ResendEmailSender` and the notifiers are never instantiated and `SubscriptionService` has no production call site. This slice wires the sender + notifiers into the composition root and adds the first real trigger: a `subscriptions.cancel` mutation.

Delivery strategy: `single-pr`, one commit per task.
Test runner: `pnpm --filter @aqui-suena/api test`.

## Specs

- **S1 — Resend config is explicit.** The email config reads `RESEND_API_KEY` and `RESEND_FROM` from the environment. An absent or empty key means no sender: the subscription notifier is simply not built, so `SubscriptionService` (whose `notifier` is optional) cancels without notifying. No silent fake.
- **S2 — Composition owns the sender and notifier.** A composition function builds the `EmailSender` (a `ResendEmailSender` when configured, otherwise `undefined`) and the `SubscriptionNotifier` (a `TemplateSubscriptionNotifier` over the shared renderer) from that config. `createApp`/`createAppRouter` accept an optional `SubscriptionNotifier` and pass it to the subscription router.
- **S3 — `subscriptions.cancel` is a real call site.** A `subscriptions.cancel` mutation wires `SubscriptionService` (subscription repository + plan repository + the notifier). It resolves the caller's active subscription, the recipient email and locale (from the account), and calls `cancel(subscriptionId, { recipientEmail, locale })`. When there is no active subscription it answers `NOT_FOUND`.
- **S4 — Entry points wire it.** `server/worker.ts` and `server/main.ts` read the email config, build the sender + notifier, and pass them into `createApp`. `WorkerEnv` gains `RESEND_API_KEY` and `RESEND_FROM`.

Out of scope: signup/verification and payment-receipt triggers (blocked on auth and payment provider), renewal reminders (needs a Worker cron), the `AccountRepository` D1 wiring beyond what the cancel endpoint needs, and actually sending mail (no key is configured in any environment yet).

## Tasks

- T1 / S1-S2 — email config + composition function + tests. DONE — RED: `composition/email.test.ts` failed to import the missing `createSubscriptionNotifier`; GREEN: no key → `undefined`, key → `TemplateSubscriptionNotifier`.
- T2 / S2 — thread the optional `SubscriptionNotifier` through `createApp`/`createAppRouter` + add `account` to the repository composition. DONE — `repositories.test.ts` `EXPECTED_KEYS` migrated to include `account`.
- T3 / S3 — `subscriptions.cancel` mutation + tests. DONE — RED: router file missing; GREEN: cancels the active subscription and notifies with the account's email/locale.
- T4 / S4 — wire `worker.ts` and `main.ts` + `RESEND_FROM` in `.env.schema` + `WorkerEnv`. DONE.
- T5 — docs/backlog. DONE.

## Log

### L2 — 2026-11-11 — implemented with strict TDD

- Commit: `b4b5006` — wire the email sender + `subscriptions.cancel`.
- Verification: `pnpm --filter @aqui-suena/api typecheck` clean, full suite 674 tests green (79 files), `biome check .` clean (418 files).
- `RESEND_FROM` added to `.env.schema`; `RESEND_API_KEY` was already declared (sensitive, injected by Infisical). No secret is committed; the code reads the env var at runtime.
- The only production trigger wired is `subscriptions.cancel`. Signup/verification, payment receipt and renewal reminders stay blocked (auth, payment provider, Worker cron).

### L1 — 2026-11-11 — request summary (paraphrased)

After closing the billing follow-ups, the user picked the "email sender + triggers" backlog item. Reconnaissance showed the domain already has `EmailSender`, `ResendEmailSender`, the renderer and the three notifiers, but none is wired and `SubscriptionService` has no production call site. The achievable slice is the sender + notifier wiring plus a `subscriptions.cancel` mutation; the auth and payment triggers stay blocked.
