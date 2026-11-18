# Refactor: project hygiene (structure, duplication, contracts)

Objective: remove the findings from the whole-project review — duplicated CRUD
orchestration, a 994-line test file, stale docs, an inverted domain dependency
and an inconsistent input contract. Branch `refactor/project-hygiene`; delivery
through one pull request; runner `pnpm --filter @aqui-suena/api test`.

## Specs

- **S1 — One ownership protocol for directory children.** Resolving a child
  resource and proving the caller owns its business happens in one place:
  resolve first (a missing resource answers `NOT_FOUND`), then check ownership
  (a foreign one answers the same thing). A new child resource cannot implement
  half of it.
- **S2 — One id contract.** Every procedure that takes a single id accepts
  `{ id }` like the rest of the API. A bare string, an empty id, a number or a
  missing field is a `BAD_REQUEST` carrying the procedure's message. The
  contract has its own tests.
- **S3 — Fiscal data belongs to the account.** `FiscalProfile` lives under
  `domain/accounts`; `domain/billing` may read it, never the reverse, and a
  dependency-cruiser rule enforces the direction.
- **S4 — A test file is scoped to one use case.** `subscription-service` tests
  are split per use case (change plan, cancel, subscribe, fail renewal,
  downgrade grace, error types) over a shared plan fixture, so a future RED
  points at a file instead of a 994-line needle.
- **S5 — Docs are findable and true.** Specs live under `docs/specs`, closed
  historical plans under `docs/archive/tasks`, and every reference points at the
  real path. `CAPABILITY-MAP.md` states what ships today, including CFDI
  delivery and account lifecycle.
- **S6 — Behaviour is unchanged.** No public procedure changes except the id
  input shape; no response, status code, ordering or persistence change. The
  suite proves it.

Out of scope: archiving closed `odd/tasks` documents (their status is not
recorded per file, so moving them would guess), and any change to the
document/PDF pipeline.

## Tasks

- **T1** — Docs layout and truth: move `SPEC-*.md` to `docs/specs`, `tasks/` to
  `docs/archive/tasks`, rewrite every reference, refresh `CAPABILITY-MAP.md`
  (S5). DONE.
- **T2** — `FiscalProfile` moved to `domain/accounts` plus the
  `api-domain-accounts-must-not-depend-on-billing` rule (S3). DONE.
- **T3** — Split the subscription-service suite per use case over a shared
  fixture module (S4). DONE.
- **T4** — `findOwned` centralises the child-resource ownership protocol across
  flyers, hours, work entries, services, photos and products (S1). DONE.
- **T5** — `idInput` replaces `requiredId`: every single-id procedure takes
  `{ id }`, with tests for the contract (S2). DONE.
- **T6** — Backlog and README reflect the new layout and the closed items (S5).
  DONE.

## Verification

- `pnpm --filter @aqui-suena/api test` — 900 tests, 113 files, green.
- `pnpm typecheck` — 8 packages clean.
- `biome check` — clean.
- `pnpm arch` — 378 modules, no violations, with the new accounts→billing rule
  active.

## Log

- **L1** — Review findings that started this slice: five directory routers
  repeating the same CRUD protocol, `subscription-service.test.ts` at 994 lines
  with 11 suites, `CAPABILITY-MAP.md` still claiming `subscriptions.cancel` was
  the only live email trigger, four competing documentation locations,
  `FiscalProfile` living in billing while being account data (accounts →
  billing → accounts), and 17 procedures taking a bare string id.
- **L2** — T4 decision: the original proposal was a generic router factory, but
  the repositories are not uniform (`hours.listByBusiness` is not paginated,
  `products` has `listAllByBusiness`, `flyers` exposes the public feed as
  `list`). A factory would need type parameters no reader could follow, so the
  invariant moved into `findOwned` and each router still declares its own
  procedures. The duplication that mattered was the protocol, not the boilerplate.
- **L3** — T6 note: closed `odd/tasks` documents keep their history in place;
  archiving them needs a per-file status that does not exist yet. Adding a
  `Status:` line when a slice closes is the cheap prerequisite.
