import type { PlanId } from "@aqui-suena/api/domain/entitlements";
import { ENTITLEMENTS } from "@aqui-suena/api/domain/entitlements";
import type { Plan, PlanRepository } from "@aqui-suena/api/domain/plans";

type PlanRow = {
  id: string;
  name: string;
  audience: string;
  description: string;
  benefits: string;
  price_monthly: number;
  price_annual: number;
  currency: string;
  active: number;
};

export class D1PlanRepository implements PlanRepository {
  constructor(private readonly db: D1Database) {}

  async list(): Promise<Plan[]> {
    const result = await this.db
      .prepare(
        "SELECT id, name, audience, description, benefits, price_monthly, price_annual, currency, active FROM plans WHERE active = 1",
      )
      .all();

    return result.results.map((row) => this.mapRow(row as PlanRow));
  }

  async getById(id: PlanId): Promise<Plan | null> {
    const result = await this.db
      .prepare(
        "SELECT id, name, audience, description, benefits, price_monthly, price_annual, currency, active FROM plans WHERE id = ? AND active = 1",
      )
      .bind(id)
      .all();

    const row = result.results[0];
    return row ? this.mapRow(row as PlanRow) : null;
  }

  private mapRow(row: PlanRow): Plan {
    return {
      id: row.id as PlanId,
      name: row.name,
      audience: row.audience,
      description: row.description,
      benefits: JSON.parse(row.benefits) as string[],
      priceMonthly: row.price_monthly,
      priceAnnual: row.price_annual,
      currency: row.currency,
      active: row.active === 1,
      entitlements: ENTITLEMENTS[row.id as keyof typeof ENTITLEMENTS],
    };
  }
}
