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

  | Endpoint                                                      | Method | Reason                                                   |
  | ------------------------------------------------------------- | ------ | -------------------------------------------------------- |
  | `businesses.list` (public directory)                          | keyset | public feed, mutable (hidden/retained), unbounded growth |
  | `flyers.list` (public feed)                                   | keyset | same growth and mutability as businesses                 |
  | `businesses.listMine`                                         | offset | owner-scoped, page-number navigation                     |
  | `media.list` (`listByOwner`)                                  | offset | owner-scoped gallery                                     |
  | `products/services/photos/work-entries/flyers.listByBusiness` | offset | business-scoped                                          |
  | `hours.listByBusiness`                                        | none   | at most 7 rows (one per day)                             |
  | `ads.carousel`                                                | none   | already ranked to bounded slots                          |

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

- S7 (global public child lists — pending decision): the global public
  `products.list`, `services.list`, `photos.list`, `hours.list`,
  `work-entries.list` return every row across every visible business. They are
  not real product feeds (products/photos/hours are browsed inside a business
  detail page via `listByBusiness`). Resolution is a separate contract change
  (scope or remove them); until then they are out of scope for pagination.

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
- T3 (S3, S4 — `flyers.list` keyset): same shape for `FlyerRepository.list`,
  keeping the visibility filter. Route: teaching.
- T4 (S3, S4 — offset scoped lists): offset pagination for `businesses.listMine`,
  `media.listByOwner`, and `listByBusiness` across products, services, photos,
  work-entries, flyers. One commit per router. Route: teaching.
- T5 (S5 — quota count audit): audit `listByBusiness().length` call sites and
  replace with `countByBusiness` or an explicit large limit.
- T6 (S6 — no-pagination confirmation): verify `hours.listByBusiness` and
  `ads.carousel` remain untouched; no accidental pagination.
- T7 (S7 — global public child lists): resolve the pending decision with the
  user; if removed/scoped, land as its own PR (contract change).
- T8 (S6 — clients/docs): client type propagation check; update SPEC + README.

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
