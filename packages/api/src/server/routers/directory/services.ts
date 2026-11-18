import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { ServiceRepository } from "@aqui-suena/api/domain/directory/service";
import { assertBusinessOwned } from "@aqui-suena/api/server/routers/directory/access";
import { findOwned } from "@aqui-suena/api/server/routers/directory/child-resource";
import { idInput, requireFound } from "@aqui-suena/api/server/trpc/errors";
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
      .input(idInput("Service id is required"))
      .query(async ({ input }) =>
        requireFound(await repository.getById(input.id), "Service not found"),
      ),

    create: protectedProcedure.input(createServiceInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      return repository.create(input);
    }),

    update: protectedProcedure.input(updateServiceInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;

      await findOwned(
        (childId) => repository.getById(childId),
        business,
        ctx.user.accountId,
        id,
        "Service not found",
      );

      return requireFound(await repository.update(id, rest), "Service not found");
    }),

    delete: protectedProcedure
      .input(idInput("Service id is required"))
      .mutation(async ({ input, ctx }) => {
        await findOwned(
          (childId) => repository.getById(childId),
          business,
          ctx.user.accountId,
          input.id,
          "Service not found",
        );

        if (!(await repository.delete(input.id))) {
          throw new NotFoundError("Service not found");
        }

        return true;
      }),
  });
}
