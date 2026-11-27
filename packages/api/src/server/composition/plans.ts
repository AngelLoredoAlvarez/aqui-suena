import { DEFAULT_PLAN_CATALOG } from "@aqui-suena/api/domain/plans/catalog";
import { InMemoryPlanRepository } from "@aqui-suena/api/infrastructure/memory/plans/in-memory-plan-repository";

/**
 * In-memory plan catalog used by tests and local runs, built from the same
 * constant the D1 seed writes.
 */
export const defaultPlanRepository = new InMemoryPlanRepository([...DEFAULT_PLAN_CATALOG]);
