import type { PlanId } from "@aqui-suena/api/domain/billing/entitlements";
import type { PlanRepository } from "@aqui-suena/api/domain/billing/plans";
import { publicProcedure, router } from "@aqui-suena/api/trpc";

export function createPlansRouter(repository: PlanRepository) {
  return router({
    list: publicProcedure.query(async () => {
      return repository.list();
    }),

    getById: publicProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0) {
          throw new Error("Plan id is required");
        }
        return value;
      })
      .query(async ({ input }) => {
        return repository.getById(input as PlanId);
      }),
  });
}
