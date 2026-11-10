import type { PlanCatalogWriter } from "@aqui-suena/api/domain/plans/catalog";
import type { Plan } from "@aqui-suena/api/domain/plans/plans";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";

/**
 * Idempotent writer for the D1 plan catalog. `created_at` is preserved on
 * update; `updated_at` always moves forward.
 */
export class D1PlanCatalogWriter implements PlanCatalogWriter {
  constructor(private readonly db: D1Database) {}

  async upsert(plan: Plan): Promise<void> {
    const now = toEpoch(new Date());

    const result = await this.db
      .prepare(
        `INSERT INTO plans (
          id, name, audience, description, benefits, price_monthly, price_annual,
          currency, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          audience = excluded.audience,
          description = excluded.description,
          benefits = excluded.benefits,
          price_monthly = excluded.price_monthly,
          price_annual = excluded.price_annual,
          currency = excluded.currency,
          active = excluded.active,
          updated_at = excluded.updated_at`,
      )
      .bind(
        plan.id,
        plan.name,
        plan.audience,
        plan.description,
        JSON.stringify(plan.benefits),
        plan.priceMonthly,
        plan.priceAnnual,
        plan.currency,
        plan.active ? 1 : 0,
        now,
        now,
      )
      .run();

    if (!result.success) {
      throw new Error(`Failed to upsert plan ${plan.id}`);
    }
  }
}
