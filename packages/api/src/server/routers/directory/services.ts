import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { ServiceRepository } from "@aqui-suena/api/domain/directory/service";
import { assertBusinessOwned } from "@aqui-suena/api/server/routers/directory/access";
import { requiredId, requireFound } from "@aqui-suena/api/server/trpc/errors";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { offsetPageEntries } from "@aqui-suena/api/shared/pagination/input";
import * as v from "valibot";

const createServiceInput = v.object({
  businessId: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.nullable(v.string()),
  basePrice: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
});

const updateServiceInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.optional(v.pipe(v.string(), v.minLength(1))),
  description: v.optional(v.nullable(v.string())),
  basePrice: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))),
});

export type ServicesRouterDeps = {
  readonly service: ServiceRepository;
  readonly business: BusinessRepository;
};

export function createServicesRouter(deps: ServicesRouterDeps) {
  const { service: repository, business } = deps;

  return router({
    listByBusiness: publicProcedure
      .input(
        v.object({
          businessId: v.pipe(v.string(), v.minLength(1)),
          ...offsetPageEntries,
        }),
      )
      .query(async ({ input }) => {
        requireFound(await business.getById(input.businessId), "Business not found");

        return repository.listByBusiness(input);
      }),

    getById: publicProcedure
      .input(requiredId("Service id is required"))
      .query(async ({ input }) =>
        requireFound(await repository.getById(input), "Service not found"),
      ),

    create: protectedProcedure.input(createServiceInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      return repository.create(input);
    }),

    update: protectedProcedure.input(updateServiceInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const current = requireFound(await repository.getById(id), "Service not found");

      await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

      return requireFound(await repository.update(id, rest), "Service not found");
    }),

    delete: protectedProcedure
      .input(requiredId("Service id is required"))
      .mutation(async ({ input, ctx }) => {
        const current = requireFound(await repository.getById(input), "Service not found");

        await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

        if (!(await repository.delete(input))) {
          throw new NotFoundError("Service not found");
        }

        return true;
      }),
  });
}
