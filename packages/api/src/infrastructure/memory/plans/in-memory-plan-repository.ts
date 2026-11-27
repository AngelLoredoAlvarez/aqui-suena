import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import type { Plan, PlanRepository } from "@aqui-suena/api/domain/plans/plans";

export class InMemoryPlanRepository implements PlanRepository {
  constructor(private readonly plans: Plan[]) {}

  async list(): Promise<Plan[]> {
    return this.plans;
  }

  async getById(id: PlanId): Promise<Plan | null> {
    return this.plans.find((plan) => plan.id === id) ?? null;
  }
}
