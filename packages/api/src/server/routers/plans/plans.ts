import { isPlanId } from "@aqui-suena/api/domain/plans/entitlements";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { requiredId, requireFound } from "@aqui-suena/api/server/trpc/errors";
import { publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";

export function createPlansRouter(repository: PlanRepository) {
  return router({
    list: publicProcedure.query(async () => {
      return repository.list();
    }),

    getById: publicProcedure.input(requiredId("Plan id is required")).query(async ({ input }) => {
      if (!isPlanId(input)) {
        throw new NotFoundError("Plan not found");
      }

      return requireFound(await repository.getById(input), "Plan not found");
    }),
  });
}
