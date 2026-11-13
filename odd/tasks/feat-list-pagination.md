# feat/list-pagination

Objective: apply the correct pagination per listing type — keyset (cursor) for
public feeds, offset for owner/business-scoped lists, none for already-bounded
lists. Branch `feat/list-pagination`. Delivery: one PR per router slice
(standing instruction: always open a PR). Test runner: vitest
(`pnpm --filter @aqui-suena/api test`). Teaching mode: the user transcribes
code; the agent specifies and reviews. Strict TDD (RED → GREEN → REFACTOR),
SOLID and CLEAN CODE mandatory.

## Specs

- S1 (offset contract): A paged offset procedure accepts
  `{ limit?: number, offset?: number }`. `limit` is an integer `>= 1` and
  `<= 100` (default `20`); `offset` is an integer `>= 0` (default `0`).
  Out-of-range values are rejected by valibot before the handler runs
  (BAD_REQUEST, not clamped). Response is
  `{ items: T[], limit: number, offset: number, nextOffset: number | null }`.
  `nextOffset` is `offset + items.length` when `items.length === limit`, and
  `null` otherwise. No `total` in v1 (avoids a COUNT(*) per request).

- S2 (keyset contract): A paged cursor procedure accepts
  `{ cursor?: string, limit?: number }`. `limit` follows S1 rules. Response is
  `{ items: T[], nextCursor: string | null }`. `nextCursor` is an opaque
  base64-encoded cursor over the `(created_at, id)` tuple, stable under
  concurrent insert/delete; `null` when there are no more rows. An invalid or
  tampered `cursor` is rejected by valibot before the handler runs
  (BAD_REQUEST). The codec is a single-responsibility unit and never leaks its
  internal format to the client.

- S3 (mapping — definitive assignment):

  | Endpoint                             | Method | Reason                                                   |
  | ------------------------------------ | ------ | -------------------------------------------------------- |
  | `businesses.list` (public directory) | keyset | public feed, mutable (hidden/retained), unbounded growth |
  | `flyers.list` (public feed)          | keyset | same growth and mutability as businesses                 |
  | `businesses.listMine`                | offset | owner-scoped, page-number navigation                     |
  | `media.list` (`listByOwner`)         | offset | owner-scoped gallery                                     |
  | `hours.listByBusiness`               | none   | at most 7 rows (one per day)                             |
  | `ads.carousel`                       | none   | already ranked to bounded slots                          |

  Correction (2026-11-13): the `listByBusiness` rows for products,
  services, photos, work-entries and flyers were repository methods, **not
  endpoints**; no public router procedure lists children per business. They
  stay unpaginated until such an endpoint exists (see T7).

- S4 (repositories): Repository `list()`/`listByBusiness()`/`listByOwner()`/
  `listMine()` methods gain a pagination parameter normalized by the router.
  Deterministic ordering is part of the contract: D1 repos add
  `ORDER BY created_at, id`; in-memory repos sort by the same keys so both
  implementations agree. Keyset repos push
  `WHERE (created_at, id) > (?, ?) ORDER BY created_at, id LIMIT ?` (with
  `limit + 1` to derive `hasNextPage`); offset repos push `LIMIT ? OFFSET ?`.

- S5 (consumers/quota): Internal consumers that only need a count (e.g.
  `products.create` quota check via `listByBusiness().length`) must not page
  silently past the cap. Use a dedicated `countByBusiness` or an explicit
  large limit; decide per call site with the user (teaching moment).

- S6 (clients): Infinite scroll is out of scope for this feature. Where a
  client consumes a paginated list, the query passes no input by default
  (server defaults apply) and the type change propagates.

- S7 (global public child lists — resolved): the unscoped `products/services/
  photos/hours/work-entries.list` procedures were replaced by
  `listByBusiness({ businessId })`, offset-paginated where the row count can
  grow and unpaginated for hours (at most seven rows). A hidden or missing
  parent answers `NOT_FOUND`; visibility is enforced once at the router instead
  of joining `businesses` in every child query. Owner-scoped child lists for
  hidden businesses are deferred until the owner portal needs them.

## Tasks

- [x] T1 (S1, S2 — shared primitives, teaching pilot, user writes): cursor codec
  (encode/decode), offset and cursor input schemas, `OffsetPage` and
  `CursorPage` types, `nextOffset`/`nextCursor` derivation helpers, with
  RED → GREEN tests. DONE: `shared/pagination/{cursor,input,page}.ts` + tests,
  714 tests green, typecheck clean. No barrel (repo uses flat imports).
- [x] T2 (S3, S4 — `businesses.list` keyset): `BusinessRepository.list` gains a
  cursor param; D1 + in-memory impls; router input; tests. DONE: keyset
  `list(input)` + `listAll()` escape hatch for internal consumers (carousel,
  visibility); `paginateCursor` refactored to a `toPoint` extractor. 719 tests
  green, typecheck clean.
- [x] T3 (S3, S4 — `flyers.list` keyset): same shape for `FlyerRepository.list`,
  keeping the visibility filter. DONE: keyset `list(input)` on InMemory + D1
  (JOIN + `(f.created_at, f.id)`); extracted `paginateKeyset` to shared and
  refactored `business.ts` onto it. 727 tests green, typecheck clean.
- [x] T4 (S3, S4 — offset scoped lists): DONE. Slice 1 `businesses.listMine`
  (a978c68); slice 2 `media.list` (c271bb5). The remaining rows named
  `listByBusiness` were repository methods with no endpoint; nothing to
  paginate (corrected in S3).
- [x] T5 (S5 — quota count audit): no change needed. The only count consumer
  is `products.create` via `listByBusiness().length`; since that method stays
  unpaginated, the count is complete. `countByBusiness` would be a performance
  optimization, not a correctness fix, and is out of scope here.
- [x] T6 (S6 — no-pagination confirmation): verified `hours.listByBusiness` and
  `ads.carousel` untouched by this feature; the only carousel change is the T2
  `list()` → `listAll()` call.
- [x] T7 (S7 — global public child lists): DONE. Replaced the five unscoped
  lists with `listByBusiness({ businessId })`; offset pagination for products,
  services, photos and work-entries; hours unpaginated and ordered by day.
  Hidden or missing parent answers NOT_FOUND. Removed the now-dead unscoped
  `list()` methods from the five domain and D1 repositories, and the
  `JOIN businesses` visibility filtering they carried.
- [x] T8 (S6 — clients/docs): no client references the replaced procedures
  (`grep` over apps and packages found none), so the type change propagates
  without app edits. SPEC-business-directory updated with the scoped child-list
  contract; README requires no change.

## Log

- L1 (2026-11-12): User requested the pagination work: branch change,
  teaching mode, strict TDD, SOLID + Clean Code mandatory. Original wording
  kept in memory, not transcribed here.
- L2 (2026-11-12): Backlog origin: pending-engineering item detected during
  the 2026-11-10 api structure/security reviews; every `list()` returns the
  full table. Branch created from main.
- L3 (2026-11-12): User authorized a scope change to the per-type mapping
  (see S3) and to start in teaching mode. Decision: replace uniform offset
  with per-type mapping — keyset for `businesses.list` + `flyers.list`, offset
  for owner/business-scoped lists, none for `hours.listByBusiness` and
  `ads.carousel`. Rewrote S1–S7 and re-opened T1–T8.
- L4 (2026-11-12): T1 done — `shared/pagination/` (cursor, input, page) with
  RED → GREEN tests. Dropped the planned `index.ts` barrel: the repo convention
  is flat imports via the `@aqui-suena/api/*` alias (e.g. `d1-epoch`), with
  `index.ts` only at package entry points; a per-folder barrel would break
  consistency. 714 tests green, typecheck clean.
- L5 (2026-11-12): T2 done — `businesses.list` keyset. Renamed the internal
  escape hatch `listVisible` → `listAll` (clearer: paginated vs all). Changed
  `paginateCursor` to take a `toPoint` extractor (T1's `createdAt: number`
  constraint did not fit the domain's `Date`). Discovered `list()` had two more
  consumers than scoped (carousel + visibility), now on `listAll`. 719 tests
  green, typecheck clean.
- L6 (2026-11-12): T3 done — `flyers.list` keyset. Extracted `paginateKeyset`
  (shared) from the duplicated InMemory sort/filter logic; `business.ts` now
  uses it too. Applied the `listVisible` → `listAll` rename that was agreed in
  T2 but had not landed in the T2 commit. 727 tests green, typecheck clean.
- L7 (2026-11-12): Session ended. T1–T3 committed (ec79ce2, e639817, 865ac6a,
  95039f0), working tree clean. Resume at T4 (offset for scoped lists). Full
  session summary in Engram.
- L8 (2026-11-13): T4 slice 1 done — `businesses.listMine` offset (a978c68).
  Added `paginateOffsetRows` + exported `compareCursorPoints`; `listByAccount`
  takes `{ accountId, limit, offset }` and returns `OffsetPage`; new
  `listAllByAccount` keeps quota/downgrade consumers whole, while `listAll`
  stays for the global visibility consumers. 730 tests green, typecheck clean.
  Correction from review: a paginated method never replaces a whole-list
  method; both coexist with distinct semantics. Next: `media.listByOwner`.
- L9 (2026-11-13): T4 slice 2 done — `media.list` offset (c271bb5). No escape
  hatch because the router is the only consumer; `toEpochSeconds` moved to
  `shared/pagination/cursor` and `business.ts` now reuses it. 734 tests green,
  typecheck clean. User authorized the agent to apply code directly from this
  point on (review-on-delivery instead of transcription). Next:
  `products.listByBusiness`, auditing its quota `.length` consumer first.
- L10 (2026-11-13): Scope correction. A consumer audit showed no router exposes
  `listByBusiness`; those rows in S3 described repository methods, not public
  endpoints. T4 is therefore complete with the two real slices, T5 needs no
  change (the method stays unpaginated, so `.length` is complete), and T6 is
  confirmed untouched. The open decision is T7: the global public child lists
  (`products/services/photos/hours/work-entries.list`) return every row and
  nothing consumes them yet; the business detail sheet needs a scoped,
  paginated child list instead.
- L11 (2026-11-13): T7 done. `products/services/photos/work-entries.list`
  became `listByBusiness({ businessId, limit?, offset? })` (offset) and
  `hours.listByBusiness({ businessId })` (unpaginated, ordered by day).
  Visibility is enforced once at the router via `business.getById`, so the
  scoped child queries no longer join `businesses`; the unscoped `list()`
  methods and their tests were removed. `products.create` keeps its complete
  quota count through `listAllByBusiness`. 744 tests green, typecheck clean.
  Review decision: no owner-scoped child list until the owner portal exists.
- L12 (2026-11-13): T8 done. No app or package referenced the replaced
  procedures, so no client type change was needed; SPEC-business-directory
  carries the new contract and README needed no edit. Feature complete:
  T1-T8 closed, every work unit verified, no pending check.
