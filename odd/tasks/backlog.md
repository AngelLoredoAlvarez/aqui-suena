# Backlog — aqui-suena

Cross-feature TODO list. Items land here when they are out of scope for the
active feature but must not be lost. Checked items move to Engram, not deleted.

Last full sync 2026-11-20 against `main` after the fiscal archive recovery
(#81), cron indexes and reminder batching (#82), per-period renewal reminders
(#83) and migration-test relocation (#84) merges. Later entries carry their own
date.

## Production wiring (closed 2026-11-10)

- [x] D1 plan catalog is seedable: `DEFAULT_PLAN_CATALOG` is the single source,
      `POST /admin/seed-plans` (guarded by `ADMIN_TOKEN`) upserts it idempotently,
      and the in-memory repository is built from the same constant. Media storage
      is explicit: the Worker never falls back to `InMemoryObjectStorage`, `/health`
      reports `media: configured|unconfigured`, and missing/partial R2 credentials
      make media mutations answer `503 SERVICE_UNAVAILABLE`. Branch
      `feat/production-wiring`; details in `odd/tasks/feat-production-wiring.md`.
      Staging seed command prepared but not executed.

## Production wiring pending

Documented state, not fixed yet. Nothing below changes behavior today.

- [ ] Email sender and triggers (partially done 2026-11-11, extended 2026-11-19):
      `ResendEmailSender`, the subscription notifier, the payment notifier and the
      CFDI notifier are instantiated in the composition root and wired through
      `createApp`/`createAppRouter`. Live: `subscriptions.cancel`,
      `billing.requestInvoice`, payment pending/receipt, renewal reminders, and
      the renewal-failed/grace-expired/plan-downgrade notices. Remaining: wire the
      `AccountNotifier` (welcome and email verification) once signup exists; until
      then those two emails are not sent. Every scheduled sender resolves the
      recipient from an account row and skips rows with `deleted_at` set — a
      deleted account keeps its financial records but must never receive mail
      again (spec S8 of `odd/tasks/feat-account-deletion.md`).
- [ ] Real listener status — PARTIAL 2026-11-16. `listener.getStatus` now
      resolves the station from D1 (`D1StationRepository`, seeded by
      `POST /admin/seed-stations`) or the in-memory harness for local Node,
      answers `NOT_FOUND` for unknown ids, returns the real `streamUrl`, and the
      client fetches over HTTP; the mock (`listeners: 42`, fixed URL) is gone.
      Listeners use a deterministic simulated count computed in the endpoint (no
      writes, no feature flag) until a real source exists. Staging verified
      2026-11-16: all three harness stations resolve and an unknown id answers
      `NOT_FOUND`. Still open: a real listener source (the heartbeat was
      discarded for D1 write cost) and the UI no-data state. See
      `odd/tasks/feat-listener-status.md`.
- [x] Listings from the database — CLOSED 2026-11-10 by removing the surface
      instead of implementing it. `directory.listings.list`, `.get`,
      `.createProduct`, `.addPhoto` and `.create` echoed the request body, returned
      fabricated ids and derived the plan from client input, duplicating the real
      `products`/`businesses`/`flyers`/`photos`/`hours`/`services`/`workEntries`
      routers, which already persist D1 data, enforce ownership and answer
      `NOT_FOUND`. Nothing consumed them; the `business` router and its tests were
      deleted (public surface 51 → 46 procedures). What actually remains open is
      narrower: `products.create` does not enforce the plan product quota, and the
      plan is not yet read from `ctx.account` — see the pagination and context items
      below.
- [x] Seed plans in staging — DONE 2026-11-10: `POST /admin/seed-plans`
      returned `{"seeded":3}` (idempotent), `plans.list` serves community, trades
      and commerce, and D1 holds 3 rows.
- [x] R2 secrets in staging — DONE 2026-11-10: the five `R2_*` secrets were
      uploaded and the Worker redeployed; `/health` reports `media: "configured"`.

## Auth and accounts (opened 2026-11-17)

- [x] Account provisioning — DONE 2026-11-17 (`feat/account-provisioning`).
      `createContext` ensures the `accounts` row for every authenticated session,
      keyed by `app_metadata.account_id ?? user.id`, with the session email
      trimmed and lowercased; one read per request, one write per account
      lifetime. `AccountRepository.ensure` is idempotent, re-syncs a changed
      email without touching `plan_id`, `locale`, `billing_email` or the fiscal
      columns, and raises `AccountEmailConflictError` when the email belongs to
      another id instead of adopting it. Proven against real SQLite: two racing
      first requests leave one row, and an owned `media` insert passes the
      foreign key right after provisioning. Details:
      `odd/tasks/feat-account-provisioning.md`.
- [x] Account deletion — DONE 2026-11-17 (`feat/account-deletion`). An owner
      erases their own account through `account.delete`: the Supabase user is
      deleted first (so an interrupted run can never let them sign back in), then
      media rows and their R2 objects, then every business with its directory
      children. The `accounts` row survives as a tombstone — email replaced by
      `deleted-<id>@deleted.invalid`, fiscal columns cleared, `deleted_at` set —
      because `subscriptions`, `payments` and `cfdi_invoices` are kept for fiscal
      retention. Proof against real SQLite: children cascade, financial rows stay,
      and the freed email provisions a brand-new account. Details:
      `odd/tasks/feat-account-deletion.md`.

## Pending engineering (post api tracks)

Detected during the api structure and security reviews, deferred to their own
branches. None of these blocks the product today.

- [x] Pagination for list endpoints — DONE 2026-11-13 (PR #16,
      `feat/list-pagination`). Keyset cursor for the public feeds
      (`businesses.list`, `flyers.list`), offset for owner/business-scoped lists
      (`businesses.listMine`, `media.list`, `products/services/photos/work-entries`
      `.listByBusiness`), and none for `hours.listByBusiness` (max 7 rows) and
      `ads.carousel`. Public child lists are now scoped per business with a single
      router-level visibility guard. Details: `odd/tasks/feat-list-pagination.md`.
- [x] Shared D1 test double — DONE 2026-11-13 (`chore/d1-test-support`).
      `FakeD1Database` in `src/testing/d1.ts` records executed statements and
      answers through a responder; the 13 repository/service test files that
      hand-rolled `prepare`/`bind`/`first`/`all`/`run` stubs now use it. The real
      `node:sqlite` adapter test keeps its own binding.
- [x] Worker observability — DONE 2026-11-13 (`chore/observability`).
      `requestLogging` (Hono) and `withRequestLogging` (Worker fetch) emit one JSON
      line per request with request id, method, path, status and duration, and a
      structured error line without stack traces. The Worker stamps `x-request-id`
      on every response; query strings, headers and bodies are never logged.
      Workers Logs/Logpush sink configuration is a separate infra change.
- [x] Api cleanups — DONE 2026-11-13 (`chore/api-cleanups`). Extracted
      `isAdminAuthorized` so the three admin endpoints share one guard; removed the
      `defaultDirectoryRepositories` singleton and the eager `appRouter` (fresh
      in-memory repositories per app, `AppRouter` stays as a type); the email
      renderer now receives `billingPath` and `ownerPortalPath` instead of
      hardcoding frontend routes.
- [x] SQL formatting and format-agnostic assertions — DONE 2026-11-17
      (`refactor/sql-format`). Statements over 120 characters break at clause
      boundaries with the clauses aligned to the literal; inserts always put
      `VALUES` on its own line; the five repeated business column lists became one
      `BUSINESS_COLUMNS` constant. Tests assert through `normalizeSql`, which
      collapses whitespace, so moving a clause to the next line can never fail a
      test that only cares about what the statement means.
- [x] Input contract normalized — DONE 2026-11-18
      (`refactor/project-hygiene`). `idInput` replaced `requiredId`: the 17
      single-id procedures (`media.delete`, `plans.getById`, the directory
      `get`/`delete` set, `businesses.getMine`) now take `{ id }` like every
      other procedure, and the contract has its own tests
      (`server/trpc/errors.test.ts`). A bare string is a `BAD_REQUEST` carrying
      the procedure message. Still true and intentionally unchanged:
      `media.list` answers `{ items, limit, offset, nextOffset }`, not a bare
      array. Details: `odd/tasks/refactor-project-hygiene.md`.

## Persistence validation and error codes (closed 2026-11-10)

- [x] Persisted enums (`plan_id`, `category`, subscription/payment `status`) are
      parsed on read and an unknown value raises `DataIntegrityError` instead of
      flowing into the domain; `media.confirm` verifies the key prefix and the real
      object metadata before persisting; client-caused failures map to
      `BAD_REQUEST`/`NOT_FOUND`/`CONFLICT` and missing entities no longer return
      `null`/`false`. Branch `fix/persistence-validation`; details in
      `odd/tasks/fix-persistence-validation.md`.

## Billing correctness (closed 2026-11-10)

- [x] Subscription periods clamp to the target month's last day in UTC, and
      renewal reminders count UTC calendar days instead of elapsed 24-hour blocks.
      Branch `fix/billing-period-math`; details in
      `odd/tasks/fix-billing-period-math.md`.

## Billing follow-ups (opened 2026-11-10)

Detected while fixing `resolvePlan`. Neither blocks anything today.

- [x] `SubscriptionService.cancel` is now idempotent — DONE 2026-11-11
      (`fix/cancel-idempotent`): a second cancel on an already-cancelled
      subscription is a no-op (no throw, no re-notify). The `changePlan` half was
      done earlier in `fix/paid-time-chaining`.
- [x] `failRenewal` now enters grace in a single atomic write — DONE 2026-11-11
      (`fix/fail-renewal-atomic`): the new `enterGrace` repository method sets
      `status = 'grace'` and `graceEnd` in one operation, eliminating the transient
      `grace` + `graceEnd === null` shape. The dead `updateGraceEnd` method was
      removed.
- [x] Plan catalog prices — DONE 2026-11-19: the catalog ships
      Oficios & Servicios at 9900/99000 and Comercios & Catálogo at
      14900/149000, final prices with IVA included; the CFDI breaks the gross
      price down as subtotal + IVA. Staging was re-seeded with
      `POST /admin/seed-plans` (3 rows).
- [x] Cash payments — DONE 2026-11-19: Conekta rebranded OXXO Pay as Conekta
      Efectivo and the direct API now takes `payment_method.type = "cash"`;
      `oxxo_cash` answers HTTP 422 `order.provider_not_found`. The adapter sends
      `cash`, and the staging probe completed end-to-end (auto-paid by the
      sandbox, webhook activation, pending and receipt emails delivered).
- [x] Rename the cash method from "OXXO" to `cash` / "Efectivo" — DONE
      2026-11-19: the domain method, API picklist, DB enum, provider mapping,
      tests and docs use `cash`; user-facing copy says "Efectivo" (es-MX) and
      "Cash" (en). Migration `0007_cash_payment_method.sql` backfills existing
      `oxxo` rows.
- [x] Distinguish card 402 decline bodies from other card 402 failures — DONE
      2026-11-19: only 402 responses with a `conekta.errors.processing.bank.*`
      code are mapped to a declined charge. Tokenization or validation 402s and
      responses without a decline code remain provider rejections. Tests cover
      `bank.declined`, `bank.insufficient_funds`, `tokenization.used` and a
      missing code.
- [x] Prevent a second plan while another plan is pending — DONE 2026-11-19:
      a new checkout is rejected when a payment for another plan is pending;
      same-plan checkouts remain allowed and expired pending payments do not
      block. The rule lives in `CheckoutService` and
      `PaymentService.hasPendingForOtherPlan`.
- [x] Delete the Conekta customer on account deletion — DONE 2026-11-19:
      `DeleteAccount` calls an optional `PaymentCustomerDeleter` for the saved
      card customer before anonymizing; a failure is logged and never blocks the
      purge. `ConektaPaymentProvider.deleteCustomer` calls
      `DELETE /customers/{id}`. Tests cover the success and best-effort failure
      paths.

## Cron cost and reminder batching (closed 2026-11-20)

- [x] Index the scheduled sweep filters — DONE 2026-11-20
      (`fix/cron-sweep-indexes-and-reminders`). Migration
      `0012_lowly_sinister_six` adds indexes only, no data change:
      `cfdi_invoices(status, updated_at)`, `payments(status, created_at)`,
      `payments(subscription_id, created_at)`, `subscriptions(status, ends_at)`,
      `subscriptions(status, grace_end)`, `subscriptions(account_id, status)`
      and `businesses(account_id)`. Every cron SELECT previously scanned the
      whole table, so D1 rows read grew linearly with table size; the indexes
      turn those scans into bounded range reads. An index adds one row written
      per write to its columns, which the read savings offset.
- [x] Batch reminders by due work — DONE 2026-11-20. The sweep now asks
      `listReminderCandidates(now, limit)` for subscriptions that still owe the
      reminder due in the current UTC day window. A recorded 7-day reminder
      removes the subscription from the batch until the 1-day window opens, so
      the five-row limit can no longer starve subscriptions behind it; deleted
      accounts and owners with reminders disabled are filtered in the query.
      Proven with a real `node:sqlite` test that seeds six subscriptions in the
      same window: the second run returns the sixth after the first five are
      reminded.
- [x] Reminders per billing period — DONE 2026-11-20
      (`fix/renewal-reminders-per-period`). The log was unique per
      `(subscription_id, type)`, so after the first renewal the subscription
      never received the 7-day or 1-day reminder again. Migration `0013`
      rebuilds `subscription_reminders` with `period_ends_at` and a unique key
      on `(subscription_id, type, period_ends_at)`; existing rows backfill from
      the subscription's current end, falling back to `sent_at`. The service and
      the candidate query scope every check to the current period, and a real
      SQLite test proves a reminder from the previous period no longer
      suppresses the new one.

## CFDI invoicing (opened 2026-11-16)

Issuing shipped in `feat/billing-cfdi` (PR #41) and runs against the Facturama
sandbox in staging. Production is not deployed and has no CSD, so
production-only work is not tracked here; staging stays on the multiemisor
endpoint with the SAT test CSD, which the `wrangler.toml` comment already
explains.

- [x] Validate the Facturama payload against the real sandbox — DONE 2026-11-17
      (PR #41). The provider rejected three assumptions, now pinned by tests:
      CFDI 4.0 requires `TaxObject` and an item `Total`, and `PaymentForm` `99`
      is only valid with `PPD`. The multiemisor response nests the stamp as
      `TaxStamp`/`XmlBase64` instead of `Complement.TaxStamp`/`ContentBase64`,
      so the adapter accepts both shapes.
- [x] Apply migrations `0001`/`0002` to staging and configure the PAC — DONE
      2026-11-17: applied with bookmark
      `00000022-00000000-00005126-66a9de4b5b8ffcc01aa66b6c9c0ad57a`, the SAT test
      CSD registered in the multiemisor API, and `FACTURAMA_USER` /
      `FACTURAMA_PASSWORD` uploaded as Worker secrets.
- [x] CFDI cancellation, phase 1 — DONE 2026-11-18 (`feat/cfdi-cancellation`).
      `billing.invoices.cancel` claims the row with a compare-and-set before
      calling the PAC, enforces the article 29-A window in Mexico City time,
      maps the six provider states to four outcomes and archives the acuse in
      R2. `billing.invoices.list` refreshes up to five pending rows per read, so
      the positive ficta is not missed. Motives `02` and `03` are supported;
      reason detail is kept for disputes. The acuse is only archived when it
      names the cancelled UUID: a mismatched document is dropped and reported in
      `cancellation_detail`, never filed as proof. Details:
      `odd/tasks/feat-cfdi-cancellation.md`.
- [x] CFDI cancellation, scheduled sweep — DONE 2026-11-18. The Worker exposes a
      `scheduled` handler with a fifteen-minute cron (default worker and staging);
      it sweeps pending rows across every account, oldest first, five per run, and
      stays silent when billing is unconfigured. The read-path refresh stays for
      first-read freshness. Details: `odd/tasks/feat-cfdi-cancellation.md`.
- [x] CFDI cancellation, motive `01` — DONE 2026-11-19 (`feat/cfdi-substitution`):
      the cancellation stamps a substitute CFDI first (relation `04` in the
      payload) and then cancels the original with `uuidReplacement`; the
      replacement UUID is persisted in `cfdi_invoices.substitution_uuid`
      (migration `0011`) so a retry reuses it. A failed stamp returns the
      original to `issued` and never reaches the PAC. Details:
      `odd/tasks/feat-cfdi-substitution.md`.
- [x] Send the CFDI by email — DONE 2026-11-18 (`feat/cfdi-email`). The CFDI
      reaches the owner with the provider PDF and the archived XML attached, so
      the fiscal document travels with the message and no signed URL can expire.
      `IssueInvoice` downloads the PDF from the file endpoint
      (`GET /cfdi/pdf/issued/{id}`, `GET /cfdi/pdf/issuedLite/{id}` for multiemisor,
      base64 inside JSON), archives it beside the XML, records `xml_key` and `pdf_key` in
      one insert (migration `0004`) and then notifies through
      `TemplateCfdiNotifier`. Every delivery failure is logged and never fails the
      request, a missing PDF still sends the XML, and a deleted account is skipped.
      Details: `odd/tasks/feat-cfdi-email.md`. Proven on staging 2026-11-18:
      stamped, both keys recorded, PDF archived as a real file and the email
      delivered with both attachments. The run found and fixed two defects: the
      PDF was fetched from the issuing endpoint (JSON archived as `.pdf`) and
      Resend was called with a bound `fetch` (Workers "Illegal invocation").
- [x] Owner-portal invoice history and downloads — API DONE 2026-11-18
      (`feat/invoice-history`). `billing.invoices.list` returns the account's
      invoices except PAC rejections, newest first, with `status` and
      `hasXml`/`hasPdf`;
      `billing.invoices.downloadUrl` authorises per invoice and returns a
      five-minute presigned URL whose signature carries
      `attachment; filename="CFDI-<uuid>.<ext>"`. The bytes never pass through the
      Worker, a missing archive answers `CONFLICT` and a foreign invoice answers
      `NOT_FOUND`. The portal UI that consumes it is still pending. Details:
      `odd/tasks/feat-invoice-history.md`.
- [x] Recover missing fiscal archives — DONE 2026-11-20
      (`feat/recover-fiscal-archives`). When an archive upload fails, the row is
      recorded as `issued` with `xmlKey`/`pdfKey` null but keeps its
      `provider_id`. The fifteen-minute cron now selects settled rows
      (`issued`, `cancelled`, `cancellation_rejected`) with a provider id and a
      missing key, re-fetches only what is missing from the PAC file endpoint
      (`/cfdi/xml|pdf/{issued|issuedLite}/{id}`), archives it in R2 and writes
      only the recovered keys (`COALESCE`), so a partial recovery never erases
      an existing archive. Every attempt is stamped even when nothing was
      recovered, so a provider outage rotates the batch instead of starving the
      rest. Unit-tested (adapter, repository, use case, composition, cron);
      staging proof still needs a forced archive failure.
- [x] Hono double logging — DONE 2026-11-17 (`fix/hono-double-logging`).
      `silentErrorHandler` in `server/http/observability.ts` answers a bare 500 and
      `createApp` registers it with `app.onError`, so Hono's built-in handler no
      longer prints the raw stack next to the structured line. `app-error.test.ts`
      drives a throwing route through the real `createApp` and requires zero
      `console.error` calls; the observability test now proves the structured line
      survives. The suite output no longer prints a stray stack.
- [x] Split the R2 signer out of the media context — DONE 2026-11-17
      (`refactor/r2-signer-split`). `infrastructure/r2/sigv4.ts` holds the generic
      SigV4 signing (`presignR2ObjectUrl`, `R2StorageOptions`); the media adapter
      stays in `infrastructure/media/r2-object-storage.ts` with the key layout and
      the size/type rules. Billing's CFDI store imports only the signer. A new
      dependency-cruiser rule forbids `infrastructure/billing` from importing
      `infrastructure/media`. Enabling that rule exposed a bigger gap: the whole
      arch config left `@aqui-suena/*` imports unresolved, so every layer rule
      silently skipped them; `options.tsConfig` now points at
      `tsconfig.base.json` and the rules resolve real files (561 phantom modules
      became 355 real ones). That surfaced one pre-existing cycle in
      `packages/ui/src/ads-carousel` (the hook imported the barrel that
      re-exported it), fixed in the same change.
- [x] Prove a full media upload round trip in staging — DONE 2026-11-17: an
      authorized probe against the staging Worker ran `media.presignUpload` → a
      client `PUT` straight to R2 → `media.confirm` → `media.list` →
      `media.delete`, 15/15 checks green. `confirm` persisted the metadata read
      back from R2 (`mime`, `size`, `r2Key`), a declared size mismatch answered
      `BAD_REQUEST`, a foreign key prefix answered `NOT_FOUND`, and after
      `delete` the object was really gone (a second `confirm` answered
      `NOT_FOUND`). `/health/deep` reports `configured`. Staging was left clean:
      no `media` rows, no probe accounts, no test users and no orphan objects.
      This is the first end-to-end run of `head` and `delete` on Workers after
      the `fetch` fix.

## Security (closed 2026-11-10)

- [x] Directory P0s: ownership guard on every directory mutation (`NOT_FOUND`
      for foreign/missing resources), hidden businesses excluded from public reads
      and child lists, and cascade delete for the 90-day retention cleanup.
      Branch `fix/p0-directory-security`; the cascade migration was applied to the
      staging D1, and the production D1 (`aqui-suena-db`) was created with the
      full schema on 2026-11-16.
      Details: `odd/tasks/fix-p0-directory-security.md`.

## Known limitations (platform)

- Android media notification (cosmetic, dev assets only): the system notification
  may show an inert "previous" button and a progress bar for finite dev assets
  (aqui-suena-pop.m4a, etc.). Root cause: expo-audio's `AudioLockScreenOptions`
  (`showPreviousTrack`, `showNextTrack`, `isLiveStream`) are already set to
  hide these, but Android's `MediaStyle` notification can still render default
  transport controls and a progress bar for media items with a known duration.
  On production live streams (`isLiveStream: true` with no finite duration),
  the progress bar is hidden. The previous button is a known expo-audio/Android
  limitation not controllable via the public API. No action taken — documented
  as expected dev-only cosmetic. See `packages/ui/src/drivers/expo-driver.native.ts`
  (`LOCK_SCREEN_OPTIONS`).

## Restyle follow-ups (from player-restyle-01)

- [x] Wide desktop composition (1440): DONE 2026-10-23. From `md` up the landing uses the 1440px canvas with a header row and the player as a full-width bottom dock bar; the station selector sits below the status text, and web adds a 44px move button at the far right. The station selector is a 480px popover at the dock's right edge. The same horizontal dock is used on mobile, tablet and web. Verified with unit tests, Playwright e2e at 1440×900, and Chrome DevTools at 390/768/1024/1440. Feature: odd/tasks/wide-desktop-composition.md. The two-column business directory (380px list + 480px flyer/detail) remains `business-directory` scope.
- [x] Empty state → ads carousel. DONE: the carousel serves real ranked inventory
      and renders the designed empty state when no sponsor is eligible.
- [ ] Ad countdown state → ads-display. PENDING: there is no expiring banner or
      time-boxed spot in the data model yet, so the countdown has no trigger.
- [ ] System-following themes (`useColorScheme` → noche/brasa) + brasa headed
      verification. The noche/brasa token sets exist; no `useColorScheme` call
      does.
- [ ] Tamagui `ZStack` cleanup for the overlay: overlays are still positioned
      with `position="absolute"` on `YStack` (`packages/ui/src/player-landing/player-dock.tsx`,
      moved out of `player-landing.tsx` by the dock refactor), the non-idiomatic
      shape found during the overlay work.
- [x] Native system bars (Android): DONE 2026-11-14 (PR #30) and verified on a
      physical device 2026-11-16 with build `caf3c458`. The landing clears the
      status bar and the player clears the navigation bar. The same safe-area hook
      covers iOS, but verifying it needs a Mac or a paid Apple Developer account,
      neither available; recorded as a platform limitation, not an open task. See
      `odd/tasks/fix-android-player-safe-area.md`.

## Platforms

- [ ] Windows/macOS signing and publishing. The desktop stays dev-only until
      then. Packaging stopped being the gap: `pnpm build` produces deb, rpm
      and AppImage from `apps/web` (verified 2026-10-21). The rpm needs an
      ASCII `productName` because Tauri writes the package in Rust and rejects
      accented names. Feature history: `odd/tasks/desktop-build.md`; tray
      runtime requirements: Engram topic `desktop/tray-runtime-requirements`.

## Verification gaps

- [x] Metro vs react-native question — RESOLVED benign 2026-10-22: the peer
      warning comes from `@react-native/community-cli-plugin@0.88.0`
      (transitive via `react-native@0.88.0`) declaring a peer on
      `@react-native/metro-config@0.88.0`, while `@expo/metro@58.0.0` pins
      `metro@0.87.1`. Expo uses its own CLI (`@expo/cli`), not the community
      CLI, so the plugin is dead code and the mismatch is harmless. Forcing
      `@react-native/metro-config@0.88.0` would break Expo's bundler. Leave
      as-is.

## Dependencies (scheduled slices, not bedtime)

- [x] TypeScript migration — DONE 2026-10-22: 5.9.3 → 7.0.2 (the native Go
      compiler). Deliberately ahead of `expo install --check` (SDK 58 expects
      `~6.0.3`); `tsconfig.base.json` dropped `baseUrl`, so it is TS7-ready.
      Feature: `odd/tasks/deps-typescript.md`.
- Patch/minor bumps applied 2026-11-16 (`chore/deps-update`): `@biomejs/biome`
  2.6.8, `@infisical/cli` 0.45.8, `turbo` 2.11.11, `varlock` 1.25.0,
  `wrangler` 4.162.0, `expo` 58.0.25, `expo-audio` 58.0.12, `expo-font`
  58.0.12, `expo-router` 58.0.31, `expo-status-bar` 58.0.5,
  `babel-preset-expo` 58.0.25, `next` 16.4.6, `@playwright/test` 1.65.1,
  `@trpc/server`/`@trpc/client` 11.28.2, `hono` 4.13.18, `@hono/node-server`
  2.1.8, `@cloudflare/workers-types` 5.20261115.1, `tamagui` and
  `@tamagui/config` 3.3.3, `jotai` 3.0.2, `jsdom` 31.0.1.
  `biome.json` schema migrated to 2.6.8 and that release's Markdown formatter
  re-indented list continuations in seven `odd/tasks/*.md` documents
  (whitespace only). `typecheck`, tests, `biome check`, `pnpm arch` and
  `pnpm check:singletons` stay green.
- Patch/minor bumps applied 2026-11-19 (`chore/update-dependencies`), from a
  fresh `pnpm outdated -r`: `@trpc/server`/`@trpc/client` 11.29.4,
  `@tanstack/react-query` 5.108.0, `wrangler` 4.164.0, `turbo` 2.11.13,
  `dependency-cruiser` 18.8.0, `@infisical/cli` 0.45.11, `expo` 58.0.26
  (`babel-preset-expo` 58.0.26, `expo-router` 58.0.32), `@tauri-apps/api`
  2.12.5, `@tauri-apps/cli` 2.12.6, `hono` 4.13.19, `@hono/node-server`
  2.1.9, `@supabase/supabase-js` 2.119.1, `@cloudflare/workers-types`
  5.20261118.1, `vitest`/`@vitest/coverage-v8` 5.1.1, `lint-staged` 17.6.1
  and `react-native-reanimated` 4.7.2. `pnpm` moved 12.16.1 → 12.21.0 in
  `packageManager`, README and the lockfile `packageManagerDependencies`.
  `biome check`, `typecheck` 7/7, `pnpm test` 7/7, `check:singletons`,
  `pnpm arch`, the web `next build` and the D1 migration drift check stay
  green. The only new `expo install --check` signal is reanimated 4.7.2
  against its expected 4.7.1, recorded with the accepted deviations below.
  Mobile dev/release builds must be rebuilt to match the bumped native
  modules.
- Pinned ahead of `expo install --check` (SDK 58), all deliberate: `typescript`
  7.0.2 (expected `~6.0.3`), `react`/`react-dom` 19.3.1 (expected 19.3.0),
  `@react-native-async-storage/async-storage` 3.1.1 (expected 2.2.0; the
  Expo Go block is obsolete now that mobile runs development/release builds),
  `react-native-gesture-handler` 3.5.0 (expected `~3.3.0`),
  `react-native-reanimated` 4.7.2 (expected 4.7.1). `@types/node` is
  26.6.6. Rust side: nothing pending.

## Discarded (T4 parity — not Turbopack-compatible, checked 2026-11-18)

Neither tool has a path under Turbopack, and one of them has no problem left to
solve in this repository. Both leave the pending list.

- [x] **Million.js — DISCARDED.** Its Next integration is a webpack plugin, and
      Turbopack has no plugin API (only loaders). The published package is also
      stale: `million@3.1.11` is from 2024-06-04, so it predates Turbopack being
      the default bundler by more than a year. Using it would mean pinning the
      web build to `--webpack`. If render cost ever becomes a problem, the
      official replacement is **React Compiler**, which Next 16 supports
      natively and Turbopack compiles without a third-party plugin (Next 16.3
      ships an experimental Rust compiler path for it).
- [x] **PattyCake — DISCARDED.** `pattycake@0.0.2` was last pushed on 2024-01-29
      and its own README calls it "highly experimental software". It ships as a
      webpack plugin, so Turbopack cannot load it. It also has nothing to
      optimize here: the repository calls `ts-pattern` in exactly one file
      (`packages/ui/src/player-landing/select-listener-status.ts`) with one
      `match()` expression, so the win would have been unmeasurable. If that
      expression ever needs to be faster, a plain exhaustive `switch` on the
      discriminated union is zero-runtime by construction and already the
      pattern the rest of the codebase uses.

## Expo Go block (resolved 2026-10-26)

- [x] `@react-native-async-storage/async-storage` 2.2.0 → 3.1.1 (major, mobile
      only) merged in `3310b2e`. The block only applied while the app ran on
      Expo Go: SDK 58's `bundledNativeModules.json` pins 2.2.0, so a 3.x JS bump
      would desync the native module. `apps/mobile` now ships a prebuilt
      `android/` project plus EAS internal builds, so the pin no longer binds.
      `expo install --check` still reports 2.2.0 as expected; that warning is
      accepted.

## New features (planned — docs/specs created 2026-10-23)

- [ ] Push notifications (docs/specs/SPEC-notifications.md) — Web Push (VAPID) + Expo Notifications + Tauri native. Cloudflare Worker dispatch. Delivery runs on free tiers; manual campaigns are a Comercios & Catálogo entitlement, while receiving and automatic publish triggers are universal. Depends on: none. NOT STARTED: no `notification_tokens` table or dispatch code yet.
- [ ] Offline/no-connection handling (docs/specs/SPEC-offline.md) — player retry, TanStack Query offline persistence, service worker. Free tier. Depends on: none. NOT STARTED: no service worker in `apps/web` yet.
- [x] Cloudflare media storage (docs/specs/SPEC-media-storage.md) — DONE: `ObjectStorage` port + `R2ObjectStorage` (SigV4 presigned URLs), D1 media repository, `media` tRPC router, Worker wiring and R2 secrets configured on the Worker.
- [x] Chatbot with Cloudflare Workers AI — DONE: support domain (plan catalog), Vectorize index seeder, Workers AI embeddings and AI Gateway wiring behind optional env vars.
- [ ] Image pipeline completion — the `OptimizedImage` component (lazy loading via IntersectionObserver, blur placeholder, error state) ships and is used by the ads carousel. MISSING: responsive size variants / `srcset` and WebP/AVIF generation, which need an image resizing service. Depends on: media storage (done).

## Email integration follow-ups (2026-11-10)

Templates, renderer and notifiers are merged. `packages/api/src/server/composition/email.ts`
instantiates `ResendEmailSender`, the subscription notifier and the CFDI notifier
and wires them through `createApp`/`createAppRouter` when `RESEND_API_KEY` is set.

- [ ] Account flows: call `AccountNotifier.emailVerificationRequested` and `.welcome` from signup and email verification once auth exists (only the null-safe Supabase seam exists today).
- [x] Payment flow: `PaymentNotifier.paymentPending` and `.paymentReceipt` are live from `PaymentService` with Conekta (2026-11-19); both skip deleted accounts.
- [x] Cancellation: `subscriptions.cancel` is live and passes the account `recipientEmail` and `locale` into `SubscriptionService.cancel` (2026-11-11).
- [x] Wire renewal reminders to the cron — DONE 2026-11-19:
      `ProcessRenewalReminders` processes active subscriptions ending within seven
      days, skips deleted accounts, and uses the D1 `subscription_reminders` log
      (migration `0008`) to prevent duplicates.
- [x] Persist `renewalRemindersEnabled` — DONE 2026-11-19:
      the value now lives in `account_preferences.renewal_reminders_enabled`
      (migration `0010`) with a default of true; `account.getPreferences` and
      `account.updatePreferences` expose it, and the renewal sweep passes the
      account flag to the reminder service.
- [x] CFDI email — DONE 2026-11-18 (`feat/cfdi-email`). `TemplateCfdiNotifier`
      delivers template 8 with the provider PDF and the archived XML attached;
      `IssueInvoice` archives the PDF beside the XML (`cfdi_invoices.pdf_key`,
      migration `0004`) and sends after recording the row. Fiscal data is only
      requested from accounts with paid time (resolved plan, not
      `accounts.plan_id`); storing it stays open to any authenticated account and
      issuing a CFDI requires a paid plan (`UPGRADE_REQUIRED` otherwise).
      `cfdi_invoices` exists since migrations `0001`/`0002`, so the dropped
      `invoices` table is closed history; `payments` still needs a `plan_id`
      snapshot before Conekta is wired.

## Account preferences (closed 2026-11-19)

- The typed one-row-per-account `account_preferences` table owns `locale` and
  `renewal_reminders_enabled` (migration `0010`); `accounts` no longer carries either
  column. Future preferences add explicit columns, never a `key/value` store.
