# fix-billing-period-math

Objective: fix two billing-domain arithmetic bugs that affect persisted dates — month-end overflow in subscription periods and DST-dependent reminder day counts — on branch `fix/billing-period-math`, TDD, one reviewable commit per bug.

Delivery strategy: `ask-on-risk` (two commits).
Test runner: `pnpm --filter @aqui-suena/api test`.

## Specs

- **S1 — Month period arithmetic clamps to the target month.** `addMonths(date, months)` lives in `domain/billing/subscriptions/period.ts`, is pure, does not mutate its input, and performs all calendar operations in UTC. The result keeps the original time of day and milliseconds. The day is clamped to the last day of the target month: `2026-01-31 + 1 = 2026-02-28`, `2024-01-31 + 1 = 2024-02-29`, `2026-03-31 + 1 = 2026-04-30`, `2026-12-31 + 1 = 2027-01-31`; `2026-01-15 + 1 = 2026-02-15`. `subscription-service.ts` uses it for upgrade, downgrade and `downgradeExpiredGrace`.
- **S2 — Reminder days are calendar days.** `daysBetween(from, to)` counts UTC calendar days (`Date.UTC(y, m, d)`), not elapsed milliseconds, so the result does not depend on the process time zone or DST. It keeps the current semantics: integer days until expiry, negative when `to` is before `from`, and the same `dueReminders` thresholds (`renewal_7d` for 2..7, `renewal_1d` for 0..1). A seven-calendar-day span that crosses a DST transition returns `7` and fires `renewal_7d`.
- **Out of scope:** `graceDeadline` and `retentionDeadline` use `setDate` and already count calendar days; do not change them. No D1 enum, seed or pagination work.

## Tasks

- T1 / S1 — `period.ts` + tests, replace the private `addMonths`, add service-level month-end coverage. DONE. RED: 3 service month-end assertions failed (got 2026-03-03). GREEN: 40 subscription tests. Commit `08fbd1b`.
- T2 / S2 — export `daysBetween` with UTC calendar-day math + tests, preserve reminder thresholds. DONE. RED: 7 `daysBetween` tests failed (function not exported). GREEN: 92 subscription tests. Commit: TBD.

## Log

### L1 — 2026-11-10 — original request (verbatim)

Contexto: repo `aqui-suena` (monorepo Turborepo, pnpm). `main` está en d6303af con el package
`@aqui-suena/api` reestructurado, reglas de capas en `.dependency-cruiser.cjs` y 538 tests verdes.
Antes de empezar leé `packages/api/README.md` ("Directory conventions") y
`odd/tasks/fix-p0-directory-security.md` para ver el patrón de trabajo de la sesión anterior.

Objetivo: corregir la aritmética de períodos de suscripción y el cálculo de días de los
recordatorios. Son dos bugs de dominio con impacto en fechas persistidas. TDD estricto
(RED → GREEN → REFACTOR), una rama, commits revisables.

Rama: `fix/billing-period-math` desde `main`.

Constraints del repo:
- Nunca trabajar sobre `main`. Commits convencionales, sin atribución de IA.
- No push, no merge, no migraciones D1 sin autorización explícita.
- Biome: prohibidas non-null assertions (`!`) y optional chaining inseguro.
- Artefactos en inglés; conversación en español.
- Al cerrar: `pnpm -r typecheck`, `pnpm -r test`, `pnpm arch`, Biome sobre lo tocado.
- Si cambiás comportamiento observable, actualizá el spec correspondiente y guardá memoria.

Bug 1 — addMonths desborda el fin de mes; extraer a `period.ts`, usar UTC, clampear.
Bug 2 — daysBetween ignora DST; contar días de calendario UTC, preservar límites.
Fuera de alcance: graceDeadline, retentionDeadline, enums D1, seeds, paginación.
Cierre: commits, evidencia RED/GREEN, typecheck/tests/arch/Biome, decisiones de semántica.
No merge ni push; esperar instrucción.
