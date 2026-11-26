import type { ENTITLEMENTS, PlanId } from "@aqui-suena/api/domain/plans/entitlements";

export type Plan = {
  id: PlanId;
  name: string;
  audience: string;
  description: string;
  benefits: string[];
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  active: boolean;
  entitlements: (typeof ENTITLEMENTS)[PlanId];
};

export interface PlanRepository {
  list(): Promise<Plan[]>;
  getById(id: PlanId): Promise<Plan | null>;
}
