# Aquí Suena

Open-stream radio with autoplay plus local business discovery, by 17Labs. A Turborepo monorepo where Next.js (web), Expo (mobile), and Tauri (desktop) share one Tamagui UI and one playback core from day one.

## Quick path

1. Install: `pnpm install` (requires Node 24, see `.nvmrc`; pnpm 12.23.0)
2. Run everything: `pnpm dev` → API on :3001, web on :3000, Metro on :8081 and the desktop window. Add `--android` to open mobile on an emulator. If a service is already listening on its port, `pnpm dev` reuses it instead of restarting it; the desktop window still opens and waits for :3000 to answer (Ctrl-C stops only what this invocation started).
3. Run a single client: `pnpm dev:web`, `pnpm dev:mobile`, `pnpm dev:desktop` (this one starts its own web).
4. Verify: `pnpm build && pnpm typecheck && pnpm exec biome check .`

## Layout

| Path              | What lives there                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`        | Next.js 16 App Router + React Native Web                                                                                                                                                                                                                                                                                                                                                                                    |
| `apps/mobile`     | Expo SDK 58 + Expo Router                                                                                                                                                                                                                                                                                                                                                                                                   |
| `apps/desktop`    | Tauri shell that wraps the web static export                                                                                                                                                                                                                                                                                                                                                                                |
| `packages/config` | Canonical `tamagui.config` (tokens, themes, fonts, media)                                                                                                                                                                                                                                                                                                                                                                   |
| `packages/ui`     | Shared Tamagui provider + components (player card, station selector, ads carousel, i18n, ts-pattern state helpers, jotai atoms) — no `next/link`, no web-only CSS                                                                                                                                                                                                                                                           |
| `packages/player` | Playback core (fallback picker, error mapper, `usePlayer`)                                                                                                                                                                                                                                                                                                                                                                  |
| `packages/api`    | tRPC contract (51 procedures across radio, directory, ads, plans, subscriptions, payments, media and support) + Hono backend (Node + Cloudflare Worker) + `/stream` proxy + transactional email (sender wired; subscription lifecycle, renewal reminders, payment pending/receipt and CFDI delivery are live; account welcome/verification wait on signup) + AI support chatbot (Vectorize RAG + AI Gateway, both optional) |
| `packages/db`     | Drizzle schema (SQLite/D1: `stations`, `listen_sessions`, `accounts`, `plans`, `subscriptions` (with `grace_end`), `payments`, `cfdi_invoices`, `businesses` (with `hidden_at`/`retained_until`, cascading directory children), `services`, `work_entries`, `products`, `photos`, `flyers`, `hours`, `media` (nullable business scope, unique object key))                                                                  |

## Scripts

| Command                             | Effect                                                                                                                                                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Everything: API on :3001, web on :3000, Metro on :8081 and the desktop window (`--android` opens the app on the emulator, `--emulator` only starts it). Reuses any service already listening on its port instead of restarting it. |
| `pnpm dev:web`                      | Web dev server                                                                                                                                                                                                                     |
| `pnpm dev:api`                      | API only, needed by web and desktop audio                                                                                                                                                                                          |
| `pnpm dev:desktop`                  | Desktop shell via Tauri dev (serves the web app on :3000)                                                                                                                                                                          |
| `pnpm dev:mobile`                   | Mobile via Expo Go                                                                                                                                                                                                                 |
| `pnpm dev:mobile:lan`               | Mobile via Expo Go with LAN IP injected (use when api/web already running)                                                                                                                                                         |
| `pnpm dev:mobile:android`           | Mobile on the Android emulator (boots an available AVD and opens the app; api/web must already be running)                                                                                                                         |
| `pnpm dev:mobile:build`             | Development build on the emulator, with lock-screen controls and background audio                                                                                                                                                  |
| `pnpm build:desktop:web`            | Static export of the web app for the Tauri bundle                                                                                                                                                                                  |
| `pnpm build:mobile:staging`         | Release Android APK pointing at the deployed backend (see `apps/mobile/STAGING.md`)                                                                                                                                                |
| `pnpm deploy:web`                   | Deploy the web static export to Cloudflare Pages                                                                                                                                                                                   |
| `pnpm deploy:api`                   | Bookmark, apply pending D1 migrations and deploy the API Worker (`--env production --yes` for prod)                                                                                                                                |
| `pnpm --filter desktop build`       | Packaged desktop app (Tauri; builds that export first)                                                                                                                                                                             |
| `pnpm build` / `test` / `typecheck` | Turbo pipelines across workspaces                                                                                                                                                                                                  |
| `pnpm lint`                         | `biome check --write .`                                                                                                                                                                                                            |
| `pnpm arch`                         | Dependency-cruiser architecture check                                                                                                                                                                                              |

## Mobile playback

`pnpm dev` does not start the emulator by default. To boot an available
emulator and open the app on it, run `pnpm dev -- --android` (or
`pnpm dev -- --emulator` to boot one and leave the app closed). The emulator
is reused if already running.

When several AVDs are installed, set `ANDROID_AVD=<name>` to pick one; with a
single AVD it is detected automatically, so the command stays machine-agnostic.

`--android` also opens the app when Metro was already running and gets reused:
the script tunnels `:8081` with `adb reverse` and deep-links Expo Go at the
server, since the reused Expo process never received `--android` itself.

Expo Go runs `expo-audio` for foreground playback, but it ships its own fixed Android manifest and cannot declare the `AudioControlsService` that lock-screen controls and background audio need. The driver detects that case and skips lock-screen activation, so Expo Go never logs a service binding failure.

Those two features need a development build: `pnpm dev:mobile:build` installs the app with the `expo-audio` config plugin applied, which declares the service. It starts its own Metro, so stop `pnpm dev` first, or pass `--no-bundler` when Metro is already running.

## Desktop packaging

Tauri embeds a **static export** of `apps/web` (`apps/web/out`), built by `pnpm build:desktop:web`. A static bundle has no backend of its own, so:

- the stream proxy lives in `packages/api`; the web server build keeps `/api/stream` working with a rewrite to it (`API_ORIGIN`, default `http://localhost:3001`);
- the packaged app bakes an absolute API base at build time: `NEXT_PUBLIC_API_BASE_URL`. Unset, the build warns and falls back to `http://localhost:3001`, which is a development artifact, not a release.

Because the export cannot host dynamic route handlers, `apps/web/app/**/route.ts` files would break packaging: backend work belongs in `packages/api`.

Both the dashboard build and the export compile from `apps/web`, and Next takes an exclusive lock on `.next`, so `pnpm build` orders them: `desktop#build` waits for `web#build`. The export runs last, which leaves `.next` holding the static export; run `pnpm --filter web build` if you need the server build there.

## Deploys

| Target                       | Command                                                                                                                                         | Where                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Web (staging)                | `PAGES_PROJECT=aqui-suena-web-staging NEXT_PUBLIC_API_BASE_URL=https://aqui-suena-api-staging.angel-loredo-alvarez.workers.dev pnpm deploy:web` | Cloudflare Pages (`https://aqui-suena-web-staging.pages.dev`)                             |
| API / stream proxy (staging) | `pnpm --filter @aqui-suena/api run deploy` (with `--env staging`)                                                                               | Cloudflare Worker (`https://aqui-suena-api-staging.angel-loredo-alvarez.workers.dev`)     |
| Mobile staging               | `pnpm build:mobile:staging`                                                                                                                     | Local release APK for Android; EAS builds Android in the cloud and documents the iOS flow |

The web app builds as a static export with `NEXT_PUBLIC_API_BASE_URL` baked, so the browser calls the deployed Worker for audio. See `apps/web/DEPLOY.md`, `packages/api/DEPLOY.md`, and `apps/mobile/STAGING.md`.

## Routes

Landing `/` is the player + sponsored directory shell + ads carousel on both
platforms, rendered from shared code. There are no station screens by product
decision: the player switches stations in place via its selector. Directory
detail routes, search, assistant, and contact actions are not built yet; the
landing links are inert until they land.

## Docs and planning

| Doc                                                        | Purpose                                                         |
| ---------------------------------------------------------- | --------------------------------------------------------------- |
| `docs/specs/SPEC-ads-display.md`                           | Sponsor carousel during listening                               |
| `docs/specs/SPEC-business-directory.md`                    | Listings: products, services, photos, hours, flyers             |
| `docs/specs/SPEC-landing.md`                               | Responsive landing shell: directory, carousel, dock, theme      |
| `docs/specs/SPEC-live-listener-count.md`                   | Superseded decision record for the heartbeat                    |
| `docs/specs/SPEC-media-storage.md`                         | Media storage: R2 upload + image optimization (free tier)       |
| `docs/specs/SPEC-memberships.md`                           | Three business plans, entitlements, and carousel priority       |
| `docs/specs/SPEC-notifications.md`                         | Push notifications: campaigns and owner triggers Comercios-only |
| `docs/specs/SPEC-offline.md`                               | Offline/no-connection handling                                  |
| `docs/specs/SPEC-owner-portal.md`                          | Owner portal: listings, billing, media/PDF viewer, spot preview |
| `docs/specs/SPEC-radio-playback.md`                        | MVP spec: autoplay, fallback, status, test-stations harness     |
| `docs/specs/SPEC-radio-spots.md`                           | Audio spots: Comercios & Catálogo only, flag off until launch   |
| `docs/specs/SPEC-splash-screens.md`                        | Splash animations, platform behavior and timing policy          |
| `docs/specs/SPEC-support-chatbot.md`                       | Support chatbot scope and constraints                           |
| `CAPABILITY-MAP.md`                                        | Module map                                                      |
| `odd/tasks/`                                               | Per-task execution trackers                                     |
| `odd/tasks/backlog.md`                                     | Cross-feature TODO list                                         |
| `docs/archive/SPEC-admin-panel.md`                         | Retired staff-panel spec (no admin panel by product decision)   |
| `docs/archive/tasks/plan.md`, `docs/archive/tasks/todo.md` | Historical radio-playback MVP plan (closed)                     |

## Status

### Current state (2026-11-20)

- **API** ships the public player surface, the business directory, memberships and billing, media storage, fiscal archives (XML, PDF and acuse) and transactional email. 1316 tests across 141 files; `typecheck`, `biome`, `pnpm arch` and `check:singletons` are green on every commit.
- **Clients**: web and mobile render the responsive landing shell (sponsored directory, ads carousel and player dock) from shared `packages/ui` code; desktop is a dev-only Tauri shell. There is no owner portal, billing view or directory detail route yet — `apps/web` has exactly one page.
- **Environments**: staging only (Worker + D1 + R2 + Pages). Production has no deployment, no company CSD and no payment provider, so production-only work is not tracked here.
- **Proven on staging**: media round trip (presign → R2 → confirm → list → delete), account provisioning on a first request, account deletion with fiscal tombstone, CFDI issuing through the sandbox PAC, delivery by email with both attachments, invoice history with signed downloads, cancellation with motive `03`, the fifteen-minute cancellation sweep firing on its own, one-off Conekta charges (card, cash, SPEI) with the renewal scheduler, and cancellation with motive `01` (substitution).
- **Not proven anywhere**: archiving a _real_ acuse (the sandbox returns a canned one, which the code now rejects), receiver acceptance or rejection, and the positive ficta.
- **Not built**: signup and verification, owner portal, push notifications, and offline handling.

### History

The radio-playback MVP is done and published to main (scaffold, UI foundation, status API mock, player core, PlayerCard, web + native autoplay, headed e2e, visual design). The stack now matches the T4 Stack (Hono, Valibot, D1/SQLite, ts-pattern, jotai, Supabase; Million.js/PattyCake deferred — webpack-only, Turbopack-incompatible; revisit if compatible options emerge). Business-plan documentation now defines three tiers — Comunidad, Oficios & Servicios, and Comercios & Catálogo — with implementation migration tracked in `docs/archive/tasks/todo-plan-tiers.md`; the previous FREE/PREMIUM track is historical. New features tracked with their specs:

- Push notifications (docs/specs/SPEC-notifications.md): Web Push + Expo + Tauri, delivery on free tiers; campaigns and automated owner triggers are exclusive to Comercios & Catálogo (the top, most expensive plan) — pending.
- Offline/no-connection handling (docs/specs/SPEC-offline.md): player retry, TanStack Query offline cache, service worker — pending.
- Cloudflare media storage (docs/specs/SPEC-media-storage.md): R2 upload, D1 media repository, `media` tRPC router — DONE.
- Chatbot with Cloudflare Workers AI: support domain, Vectorize index and AI Gateway wiring — DONE.
- Image pipeline: `OptimizedImage` (lazy loading + blur placeholder) ships and is used by the ads carousel; native renders through expo-image with a stable cache key, landing flyers use a stable public API image URL so the web and desktop caches survive carousel refetches, and adjacent flyer images are prefetched while the current one is visible. A `priority` image also reads the element on mount (`complete` + `naturalWidth`), so one that finishes loading before hydration attaches `onLoad` still becomes visible instead of staying transparent. Responsive size variants, WebP/AVIF generation and the offline service-worker cache are still pending.

Next, tracked in `odd/tasks/backlog.md` and the `free-test-stations` feature:

- Safe test-stations harness: 3 self-hosted dev channels + proof file — DONE (channels live in player-landing, SPEC + .gitignore in place).
- Desktop wide (1440) composition — DONE: from the `md` breakpoint up the landing uses the 1440px canvas with a header row and the player as a full-width bottom dock bar; the station selector sits below the status text, and web adds a 44px move button at the far right. The station selector becomes a 480px popover at the dock's right edge, with a pointer-transparent container so outside clicks close it. The same horizontal dock is used on mobile, tablet and web, with the design's 64px circular play button in primary/onPrimary colors. See `docs/specs/SPEC-radio-playback.md` (Responsive composition).
- **Flyer fit (2026-11-25)**: carousel flyers render with `object-fit: contain` instead of `cover`. Uploaded flyers have arbitrary aspect ratios (0.48–1.0 in the seeded set) while the panel ratio differs per breakpoint (tablet 0.569, web 0.698, mobile 0.749), so covering hid 15–43 % of the ad (name, prices, phone). The letterbox uses `surface2`; the design export's `fit=cover` is superseded.
- **Flyer viewer (2026-11-25)**: pressing a flyer opens a fullscreen viewer with the whole flyer; 1×–3× zoom via ctrl/meta + wheel, double click, `+`/`-`/`0` and drag on web, pinch and drag on native. A floating pill adds zoom in/out/reset and a download action: web saves `flyer-<business>.<ext>` from a blob, native opens the share sheet with `expo-sharing` after caching the file. Escape, a tap or the close button dismiss it, and auto-advance pauses while it is open.
- Landing v2 shell — DONE (2026-11-23): mobile header/search/assistant/language/menu + carousel + dock; tablet/web header + 300/380 px sponsored directory + carousel detail panel with contact rows/actions + dock; web theme toggle persists Noche/Brasa. Navigation, search, assistant, business detail and contact actions are inert until their routes land. Unit tests, the web build, and Playwright at 390×844, 1024×768 and 1440×900 are green. See `docs/specs/SPEC-landing.md`.
- Ads carousel now serves real ranked inventory by plan (Comercios > Oficios > Comunidad, recency tie-break) via `ads.carousel` (F1+F2 complete); no static seed, empty state shown when no sponsors. Carousel now expands 1/2/3 appearances per cycle with consecutive-repeat avoidance (Task 1 (b)).
- Business plan Task 1 complete (2026-11-09): business count caps, downgrade/grace helpers, DB schema (hiddenAt/retainedUntil, grace status + graceEnd), 90-day cleanup, email warnings (grace period), and renewal/downgrade notifications (EmailSender port + notifiers) all implemented. The sender is wired through the composition root; `subscriptions.cancel` and `billing.requestInvoice` are the live call sites. Only plan selection/billing views (Task 2) and directory data/owner forms (Task 3) remain.
- Directory security P0 complete (2026-11-10): every directory mutation requires business ownership (a foreign or missing resource answers `NOT_FOUND`), hidden businesses are excluded from public reads and child lists while their owner keeps access, and the eight child foreign keys cascade on business deletion so the 90-day retention cleanup works. The cascade migration was applied to the staging D1 on 2026-11-10, and the production D1 was created on 2026-11-16 with the full schema applied. See `odd/tasks/fix-p0-directory-security.md`.
- Billing period math corrected (2026-11-10): subscription periods clamp month-end in UTC (`2026-01-31 + 1 month = 2026-02-28`, or February 29 in a leap year) and renewal reminders count UTC calendar days, so DST no longer shifts the `renewal_7d` boundary. See `odd/tasks/fix-billing-period-math.md`.
- Plan resolution corrected (2026-11-10): `resolvePlan` no longer downgrades every non-active subscription to `community`. A cancellation keeps the paid plan until the end of the billing period (exclusive at `endsAt`) and a failed renewal keeps it while the 7-day grace window is open (inclusive at `graceEnd`), as `docs/specs/SPEC-memberships.md` requires; the resolver takes an injectable clock and its exhaustive status switch fails the build if a status is added. See `odd/tasks/fix-resolve-plan-grace.md`.
- Persistence validation and API error codes corrected (2026-11-10): D1 mappers parse persisted plan/category/status enums and raise a logged `DataIntegrityError` instead of trusting casts; `media.confirm` verifies the owner/kind key prefix and the real object metadata before persisting; client-caused failures map to `BAD_REQUEST`/`NOT_FOUND`/`CONFLICT`, and missing or foreign entities no longer return `null`/`false`. See `odd/tasks/fix-persistence-validation.md`.
- Production wiring closed (2026-11-10): `POST /admin/seed-plans` idempotently seeds the D1 plan catalog from the same constant the in-memory repository uses, and media storage is an explicit dependency — `/health` reports `media: configured|unconfigured`, missing storage answers `503`, and the Worker no longer falls back to an in-memory fake. See `odd/tasks/feat-production-wiring.md`.
- Transactional email templates complete (2026-11-11): 11 templates (es-MX/en) live in `packages/api/design/email-templates/` with runtime rendering in `packages/api/src/infrastructure/email/`, migrated to a typed renderer with missing-variable guards and HTML escaping, and wired through domain notifiers for subscription lifecycle, account lifecycle and receipts. Accounts now persist `locale` (default `es-MX`). `ResendEmailSender` and the notifiers are instantiated in `packages/api/src/server/composition/email.ts` and wired through `createApp`/`createAppRouter`. Live triggers: `subscriptions.cancel` (2026-11-11), `billing.requestInvoice` (2026-11-18), the payment pending/receipt emails and renewal reminders with Conekta and the cron, and the renewal-failed, grace-expired and plan-downgrade notices (2026-11-19). The account welcome and verification emails remain pending on signup.
- Listener status is real (2026-11-13): `listener.getStatus` resolves the station and stream URL from D1 (or the in-memory harness locally), answers `NOT_FOUND` for unknown ids and serves a deterministic simulated count computed in the endpoint. A heartbeat was evaluated and discarded for D1 write cost; `docs/specs/SPEC-live-listener-count.md` records the decision.
- API hygiene tracks closed (2026-11-13): keyset/offset pagination across the list endpoints, structured request logs with `x-request-id`, one shared admin guard, no repository singleton, and a shared `FakeD1Database` test double.
- Mobile staging is demo-ready (2026-11-13): the app points at the staging Worker and Pages origins, Infisical session failures explain themselves, and EAS internal builds produce an installable Android APK. The iOS flow is documented in `apps/mobile/STAGING.md` but has not been built yet (it needs a paid Apple Developer account).
- Native safe areas fixed and verified (2026-11-16): the landing and player dock respect the Android system bars through a native-only inset hook, and the web resolves to zero. Verified on a physical Android device with the `caf3c458` staging build. The same hook covers iOS, which cannot be verified without a Mac or a paid Apple Developer account.
- Account provisioning (2026-11-17): `createContext` ensures the `accounts` row for every authenticated session, keyed by `app_metadata.account_id ?? user.id`, re-syncing a changed email without touching plan, locale, billing email or the fiscal columns. One read per request, one write per account lifetime, and two racing first requests leave one row. Verified on staging 10/10. See `odd/tasks/feat-account-provisioning.md`.
- Account deletion (2026-11-17): an owner erases their own account through `account.delete`; the Supabase user goes first, then media objects and rows, then businesses with their children, and the `accounts` row survives as an anonymized tombstone because `subscriptions`, `payments` and `cfdi_invoices` are kept for fiscal retention. The freed email can sign up again. Verified on staging 12/12. See `odd/tasks/feat-account-deletion.md`.
- CFDI issuing (2026-11-17): `billing.requestInvoice` issues a fiscally valid CFDI through a PAC (`InvoiceIssuer` port, Facturama sandbox), archives the XML in R2 and records every attempt in `cfdi_invoices` as `issued` or `failed`. Issuing requires a paid plan; saving fiscal data does not. Proven against the sandbox, with three provider assumptions pinned by tests. See `odd/tasks/feat-billing-cfdi.md`.
- Project hygiene (2026-11-18): the directory child resources share one ownership protocol, the 17 single-id procedures take `{ id }` instead of a bare string, `FiscalProfile` moved to the account domain with a cruiser rule that forbids the reverse, the subscription suite split per use case, and specs and closed plans moved under `docs/`. See `odd/tasks/refactor-project-hygiene.md`.
- CFDI cancellation (2026-11-18): an owner can cancel an issued invoice with motive `02` or `03`. The row is claimed with a compare-and-set before the PAC is called, the article 29-A window is enforced in Mexico City time, the provider's six states map to four outcomes, and the acuse is archived in R2. Reading the history refreshes pending rows, so the positive ficta is not missed. See `odd/tasks/feat-cfdi-cancellation.md`.
- CFDI delivery by email (2026-11-18): a stamped invoice now reaches the owner with the provider PDF and the archived XML attached, so the fiscal document travels with the message instead of hanging from a link that expires. `IssueInvoice` downloads the PDF, archives it in R2 next to the XML (`cfdi_invoices.pdf_key`, migration `0004`), records both keys in one insert and then notifies; every delivery failure is logged and never fails the request, and a deleted account is never emailed. See `odd/tasks/feat-cfdi-email.md`.
- CFDI substitution (2026-11-19): cancelling with motive `01` stamps a substitute CFDI first — relation `04` in the payload and `uuidReplacement` on the cancellation — and records the replacement in `cfdi_invoices.substitution_uuid` (migration `0011`), so a retry reuses it instead of stamping twice. A failed stamp returns the original to `issued` and never reaches the PAC. `billing.invoices.cancel` keeps its contract and the invoice summary exposes the replacement UUID. See `odd/tasks/feat-cfdi-substitution.md`.
- Conekta payments (2026-11-19): one-off Conekta charges per billing period with the project's own renewal scheduler (not Conekta recurring subscriptions). Card, cash (Conekta Efectivo) and SPEI flow through `billing.checkout`; the RSA-signed webhook confirms each charge with idempotency plus amount/currency checks; and the fifteen-minute cron refreshes pending payments and renews due subscriptions. See `odd/tasks/feat-conekta-payments.md`.
- Renewal reminders and account preferences (2026-11-19): the fifteen-minute cron sends the 7-day, 1-day and failed-payment reminders through the renewal-reminder service with a D1 `subscription_reminders` log, and the `account_preferences` table now owns `locale` and `renewal_reminders_enabled` (migration `0010`).
- Security hardening (2026-11-20): Cloudflare rate limiting on the Worker (per-IP, including the `/admin/*` seeding endpoints), a constant-time admin token comparison, PII scrubbed from logs, a 1 MB cap on the Conekta webhook body, and Workers Logs + Traces enabled.
- Fiscal archive recovery (2026-11-20): the fifteen-minute cron re-fetches a stamped CFDI's XML and/or PDF from the PAC file endpoint when the row kept its `provider_id` but lost the R2 key (`xml_key`/`pdf_key` null). Only the recovered keys are written, so a partial recovery never erases an existing archive, and every attempt is stamped even on failure so a provider outage rotates the batch instead of pinning it. Unit-tested; a staging exercise still requires forcing an archive failure.
- Cron query indexes and reminder batching (2026-11-20): migration `0012` adds indexes for the scheduled sweep filters (`cfdi_invoices`, `payments`, `subscriptions` and `businesses`) and turns the full-table scans into bounded range reads. The renewal reminder sweep now selects only subscriptions that still owe the reminder due in the current UTC day window, so a full five-row batch no longer starves the subscriptions behind it; deleted accounts and owners with reminders disabled are filtered in the query.
- Reminders per billing period (2026-11-20): migration `0013` scopes `subscription_reminders` by `period_ends_at`, so a renewed subscription gets its own 7-day and 1-day reminders instead of inheriting the previous period's log. Existing rows backfill from the subscription's current end, with `sent_at` as the fallback.
- Desktop boot splash (2026-11-23): the Tauri shell marks the document before first paint and shows the Noche y Brasa splash (`WSplash`) from the static export while the webview boots; the design's splash animations run (2.4 s fill loop, arc/bar/bit/code/cursor) and the overlay fades out after 2 s, and the Tauri window background is `#0F1720` so no white frame leaks. Browser and PWA visitors keep the ungated landing. Covered by `apps/web/e2e/splash.spec.ts`; animation and timing policy: `docs/specs/SPEC-splash-screens.md`.
- Native boot splash (2026-11-23): the Expo shell keeps the system splash visible until Plus Jakarta Sans loads, then shows the `MSplash`/`TSplash` boot screen (logo, title, the design's arc/bar/fill/bit/code/cursor animations and 17Labs mark) for 2 s. The system splash uses the transparent `splash-logo-dark.png` on `#0F1720` through the `expo-splash-screen` plugin. The light `MSplashL`/`TSplashL` variants wait for the theme switch. See `docs/specs/SPEC-splash-screens.md`.

### Next

Ordered by what unblocks what; the live list is `odd/tasks/backlog.md`.

1. **Signup and verification** (`create-account` with birthdate, T&C and an 18+ attestation). It unblocks the account emails, the owner portal and anything plan-selection related.
2. **Owner portal** (`/owner`, `/owner/listings`, `/owner/billing`): directory forms, plan selection and invoice history with downloads. The API it consumes already ships.
3. **Push notifications**, **offline handling**, responsive image variants, ads countdown state, system-following themes, `ZStack` overlay cleanup.
4. **Windows/macOS signing and publishing**; desktop stays dev-only until then.

## Conventions

- Documents in English; Biome for lint/format (no ESLint/Prettier).
- Email design templates (`packages/api/design/email-templates/**/*.html`) disable
  `complexity/noImportantStyles`: the `@media` rules must override the inline
  `style` attributes those templates use, so `!important` is required there.
- Conventional Commits on feature branches.

### Branch protection and the quality gate

`main` is protected: changes land through a pull request, direct pushes and
force pushes are rejected, and the branch must be up to date before merging.
Required checks are `quality` (`.github/workflows/quality.yml`) and `scan`
(gitleaks). The `quality` workflow runs `biome check`, `pnpm arch`,
`pnpm -r typecheck`, `pnpm test`, the api coverage thresholds and
`pnpm check:singletons` on every push to `main` and on every pull request.

Flow:

1. Branch from `main` (`feature/<name>`, `fix/<name>`, `docs/<name>`, `chore/<name>`).
2. Commit with a Conventional Commit message.
3. Push the branch and open a pull request.
4. Wait for `quality` and `scan` to pass.
5. Merge from GitHub. A local `git merge` plus `git push origin main` is rejected.

### Environment variables (Varlock + Infisical)

`.env.schema` is the single source of truth for environment variables (types,
required/optional, defaults). Secrets live in Infisical and are injected at
runtime with `infisical run -- <command>`; no `.env` files are committed
(`.env*` is gitignored, except `.env.schema`).

Active environments: **dev** (local) and **staging** (Cloudflare). Production
is temporarily disabled (no Supabase project yet); `main` maps to `staging` in
`.infisical.yaml`. Infisical environments: `dev`, `staging`. Cloudflare
resources per environment:

- D1: `aqui-suena-db-staging` for staging and `aqui-suena-db` for production
  (the production database exists with the schema applied but no Worker
  deploys to it yet). Dev uses a local SQLite database at
  `.dev/d1/aqui-suena.sqlite`; there is no remote dev database.
- R2: `aqui-suena-media-dev` for local dev and `aqui-suena-media-staging` for
  staging.
- Worker: `aqui-suena-api-staging` (staging only; dev runs locally)
- Pages: `aqui-suena-web-staging`

`pnpm dev` on a feature branch uses the `dev` Infisical environment: the Node
API opens `.dev/d1/aqui-suena.sqlite`, applies pending migrations from
`packages/db/migrations`, seeds the plan catalog and, when the dev R2
credentials are present, stores media in `aqui-suena-media-dev`. Without those
credentials media falls back to the in-memory adapter. Override the database
path with `LOCAL_D1_PATH`; delete the file (and its `-wal`/`-shm` siblings) to
reset local data. `main` and `staging` map to the staging environment, so local
work belongs on a feature branch.

Auth uses the dev Supabase project: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SECRET_KEY` and `SUPABASE_JWKS_URL` come from Infisical `dev`, and an
authenticated request provisions its account into the local D1. The web and
native sign-in flows are not wired yet.

- `pnpm varlock:load` — resolve and validate the current environment.
- `pnpm varlock:audit` — check that schema and code references agree.
- `pnpm varlock:codegen` — regenerate the auto-generated `env.d.ts` types.
- `pnpm exec infisical run -- pnpm dev` — run any command with secrets injected.

### Secret scanning (gitleaks)

`gitleaks` scans commits and the working tree for leaked credentials. The
pre-commit hook runs it on staged changes when the binary is installed; CI
(`.github/workflows/gitleaks.yml`) enforces it on every push and pull request.

Install the binary (not an npm package):

- macOS: `brew install gitleaks`
- Linux: download the latest release from
  https://github.com/gitleaks/gitleaks/releases, or
  `go install github.com/zricethezav/gitleaks/v8@latest` (add `~/go/bin` to
  `PATH`).
- Windows: `scoop install gitleaks` or `choco install gitleaks`.

Run manually:

- `pnpm gitleaks:scan` — scan the whole git history
- `pnpm gitleaks:dir` — scan the working tree

Configuration lives in `.gitleaks.toml`; allowlist generated/vendored paths
there. Use `// gitleaks:allow` on a line to suppress a single false positive.
