# Backlog — aqui-suena

Cross-feature TODO list. Items land here when they are out of scope for the
active feature but must not be lost. Checked items move to Engram, not deleted.

Last synced 2026-11-18 against `main` at the `refactor/project-hygiene` merge (CFDI delivery by email with the PDF and XML attached, the PDF archived in R2, account provisioning and deletion shipped, the id input contract normalized, and the specs moved under `docs/specs`; the owner-portal invoice history and download surface is the newest tracked gap).

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

- [ ] Email sender and triggers (partially done 2026-11-11, extended 2026-11-18):
      `ResendEmailSender`, the subscription notifier and the CFDI notifier are
      instantiated in the composition root (`feat/email-sender-wiring`,
      `feat/cfdi-email`) and wired through `createApp`/`createAppRouter`;
      `subscriptions.cancel` and `billing.requestInvoice` are the live call
      sites. Remaining: wire the `AccountNotifier` and `PaymentNotifier`, and add
      the signup/verification, payment receipt, renewal-reminder and downgrade
      call sites (blocked on signup, a payment provider and a Worker cron). Until
      those exist, only the cancellation and CFDI delivery emails are sent. **When the cron lands:** every
      scheduled sender must resolve the recipient from an account row and skip
      rows with `deleted_at` set — a deleted account keeps its financial records
      but must never receive mail again (spec S8 of
      `odd/tasks/feat-account-deletion.md`).
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
- [ ] CFDI cancellation slice: the emitter requests cancellation with a motive and
      the receiver accepts or rejects within 72 hours, so it needs
      `issued` → `cancellation_pending` → `cancelled` | `cancellation_rejected`,
      a reconciliation job and motive `01` substitution support.
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
- [ ] Owner-portal invoice history and downloads: `CfdiInvoiceRepository` only has
      `create()`, so there is no `listByAccount`/`getById` to show past CFDIs. The
      archived `xml_key`/`pdf_key` make the download cheap, but serving them needs
      an authentication decision (presigned R2 URL versus an authenticated
      endpoint) and the portal surface itself.
- [ ] Recover missing XML archives: when the R2 upload fails, the row is recorded
      as `issued` with `xmlKey: null`. A job can re-fetch the XML by `providerId`.
      The same applies to `pdfKey` now that it exists.
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
- Pinned ahead of `expo install --check` (SDK 58), all deliberate: `typescript`
  7.0.2 (expected `~6.0.3`), `react`/`react-dom` 19.3.1 (expected 19.3.0),
  `@react-native-async-storage/async-storage` 3.1.1 (expected 2.2.0; the
  Expo Go block is obsolete now that mobile runs development/release builds),
  `react-native-gesture-handler` 3.5.0 (expected `~3.3.0`). `@types/node` is
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
- [ ] Payment flow: call `PaymentNotifier.paymentReceipt` when a charge completes; no payment provider is integrated yet.
- [x] Cancellation: `subscriptions.cancel` is live and passes the account `recipientEmail` and `locale` into `SubscriptionService.cancel` (2026-11-11).
- [ ] Persist `renewalRemindersEnabled` (see the account preferences deferral below).
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

## Deferred (account preferences — revisit on the third preference)

- Account preferences table (`account_preferences`). DEFERRED: `accounts` holds one
  persisted preference (`locale`) and `renewalRemindersEnabled` is specified but not
  persisted yet. A key/value table would lose type safety to solve a problem that does
  not exist, and adding a column here is a cheap additive change (drizzle-diffed
  `ALTER TABLE`, no rewrite). Revisit when any of these holds: a third persisted
  preference; notification consent needs an audit trail (LFPDPPP) recording when and
  from where it was granted or revoked; preferences vary by plan; owners can define
  their own rules. When it happens, prefer a typed one-row-per-account table with
  explicit columns over a `key/value` store.
