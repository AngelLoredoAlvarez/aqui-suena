# Feature: CFDI cancellation (phase 1)

Objective: an owner can request cancellation of an issued CFDI, the request is
recorded before the PAC is called, the six states the provider reports are mapped
to our model, the acuse is archived, and a pending cancellation reconciles
itself when the history is read. Branch `feat/cfdi-cancellation`; delivery
through one pull request; runner `pnpm --filter @aqui-suena/api test`. Teaching
mode: the user writes the implementation, the agent explains and hands exact code.

## Decisions

- **Intent first, PAC second.** The row moves to `cancellation_pending` with a
  compare-and-set before any provider call, so a crash between the response and
  the write cannot lose the fiscal act, and two concurrent requests cannot both
  reach the PAC.
- **The provider's vocabulary is mapped, not stored.** `canceled`, `acepted` and
  `expired` all mean cancelled; `rejected` means the invoice stays valid;
  `active` means it is not cancellable at all. Our status is the domain truth.
- **The acuse is a fiscal document.** It goes to R2 next to the XML and PDF
  (`acuse_key`), because it is the proof of the cancellation and is retained like
  the rest.
- **The legal window is enforced by us.** Article 29-A allows cancellation only
  until the month the annual ISR return is filed for the invoice's fiscal year.
  Sending it to the PAC and getting a rejection is not an acceptable substitute
  for refusing it ourselves.
- **Motive 01 (with substitution) is phase 2.** Phase 1 supports 02 and 03, which
  are the cases this product has.

## Specs

- **S1 — Only an issued invoice can be cancelled.** A row in `failed`,
  `cancelled`, `cancellation_pending` or `cancellation_rejected` answers
  `CONFLICT`, and the PAC is never called.
- **S2 — Intent is recorded atomically.** The transition to
  `cancellation_pending` is a single `UPDATE ... WHERE status = 'issued'` setting
  the status, motive and request timestamp. Zero affected rows means someone else
  won the race.
- **S3 — The legal window is enforced.** A request after the window (the month the
  annual ISR return is due for the invoice's fiscal year) answers
  `VALIDATION_ERROR` with a message naming the deadline, and nothing is called.
- **S4 — Six provider states map to five domain states.** `canceled`, `acepted`
  and `expired` become `cancelled`; `pending` keeps `cancellation_pending`;
  `rejected` becomes `cancellation_rejected`; `active` returns the row to
  `issued` with the provider message.
- **S5 — Everything the provider answers is kept.** Motive, request and resolution
  timestamps, the provider status, the message, the expiry of the receiver window
  and the acuse key are persisted, so a later dispute can be answered from our
  data.
- **S6 — The acuse is archived.** When the response carries base64 acuse XML it is
  stored in R2 under the invoice's prefix and its key recorded; a failed archive
  never fails the cancellation (same rule as the CFDI itself).
- **S7 — A provider rejection is a domain answer, not a crash.** A non-2xx answer
  from the PAC raises a typed error carrying the provider detail, and the row keeps
  its previous state rather than inventing one.
- **S8 — Pending reconciles on read.** Listing invoices refreshes rows in
  `cancellation_pending` whose last check is older than the reconciliation
  interval or whose receiver window expired, so the owner never sees "pending"
  after the SAT already cancelled it (positive ficta included).
- **S9 — The list reports cancellation state.** `invoices.list` exposes the status
  and, for a cancelled invoice, its motive and resolution date; cancelled invoices
  stay in the history, because a cancelled CFDI is still fiscal history.
- **S10 — Downloading a cancelled invoice still works.** The XML is the legal
  record; cancellation changes its state, not its existence.

Out of scope: the cron sweep, motive 01 with a substitute CFDI, receiver-side
acceptance handling, refunds and payment coupling, and any UI.

## Tasks

- **T1** — Domain model: statuses, audit fields, legal window helper and its tests. DONE.
- **T2** — Migration `0005`, schema and D1 mapping/insert. DONE.
- **T3** — PAC port `cancelInvoice` and the Facturama adapter with its response
  mapping. DONE.
- **T4** — `CancelInvoice` use case: compare-and-set, window, state mapping, acuse. DONE.
- **T5** — `billing.invoices.cancel` and the list fields. DONE.
- **T6** — Lazy reconciliation inside `invoices.list`. DONE.
- **T7** — Docs. DONE.

## Phase 2 — scheduled sweep

The reconciliation that runs on read only helps accounts that open their history.
An account that never looks would keep `cancellation_pending` forever, even after
the positive ficta cancelled the CFDI.

- **S8 — A cron sweeps without a session.** The Worker exposes a `scheduled`
  handler and `wrangler.toml` declares a fifteen-minute trigger for the default
  worker and for staging. It builds only the cancellation chain — no router, no
  app — and awaits the sweep.
- **S9 — The sweep is bounded and oldest-first.** At most five rows per run,
  ordered by `updated_at`, across all accounts. An empty queue touches the database
  once and stops.
- **S10 — Unconfigured deployments stay quiet.** Without a PAC or R2 the sweep logs
  one line and returns instead of throwing, because staging without billing is a
  valid deployment.
- The read-path reconciliation stays. It is bounded and cheap, and it keeps the
  first read fresh; the cron covers the accounts nobody opens.

Out of scope still: motive `01` with a substitute CFDI.

## Verification

- `pnpm --filter @aqui-suena/api test` — 964 tests, 118 files, green.
- `typecheck`, `biome check`, `pnpm arch`, `check:singletons` — clean.
- Not exercised on staging yet: the adapter is covered by unit tests against the
  provider contract, and the happy path can be cancelled for real in sandbox
  (only `EKU9003173C9` issued CFDIs are cancellable there). The receiver rejection,
  the pending window and the positive ficta cannot be forced from sandbox, so they
  stay covered by fakes.

## Log

- **L1** — Phase 1 authorised with teaching mode. Phase 2 (cron, motive 01) stays
  in `odd/tasks/backlog.md`.
- **L3** — The use case had to change one earlier decision: `listByAccount` and
  `getByIdForAccount` no longer filter on `issued`. A cancelled invoice is still
  fiscal history and must stay visible, and a download of a cancelled CFDI is
  still the legal record. Only `failed` rows are excluded from the list.
- **L7** — Motive `01` is deferred until the payment provider lands. It needs no
  payment integration to be built or tested (the sandbox cancels and substitutes
  with `EKU9003173C9`), but it _exists_ for the case "a charge happened and its
  invoice has the wrong fiscal data", which has no meaning while no charge exists.
  Building it now would mean rewriting the substitute payload once `payment_id` and
  the real payment form arrive.
- **L6** — The first `[triggers]` block was placed right after `name`, which made
  every following top-level key (`main`, `compatibility_date`) belong to it. The
  `wrangler deploy --dry-run` caught it before CI: "Unexpected fields found in
  triggers field". The block now sits at the end of its section.
- **L5** — The staging probe found that Facturama sandbox returns a canned acuse
  (UUID `0088B8E0-…`, `EstatusUUID 201`, dated 2021) instead of the real one. The
  code archived whatever arrived, so a document proving nothing could be filed as
  proof. `archiveAcuse` now checks the acuse names the cancelled UUID: a mismatch
  is dropped, recorded in `cancellation_detail` as "acuse does not match the
  invoice", and never fails a cancellation that already happened. Added after the
  first merge, in `fix/acuse-must-match-invoice`.
- **L4** — Reconciliation runs inside the listing query, which writes on a GET.
  Accepted on purpose with hard bounds (five rows per call, only expired windows
  or stale checks). It moves to the cron when that exists, leaving the listing
  pure; recorded as conscious debt rather than an oversight.
- **L2** — Verified provider facts: sandbox only cancels CFDIs emitted with
  `EKU9003173C9` (our sandbox emitter), so the happy path is testable for real;
  `rejected` keeps the invoice valid, and a second request after a rejection that
  goes unanswered ends as "plazo vencido" with the invoice still valid, which is
  why a rejected cancellation is not an automatic retry.

- **L8** — Motive `01` closes in `feat/cfdi-substitution`
  (`odd/tasks/feat-cfdi-substitution.md`): the substitute is stamped with relation
  `04` and the original is cancelled with `uuidReplacement`; the replacement UUID
  is persisted so a retry does not stamp twice.
