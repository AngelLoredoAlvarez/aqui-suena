import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { FlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import { assertBusinessOwned } from "@aqui-suena/api/server/routers/directory/access";
import { requiredId, requireFound } from "@aqui-suena/api/server/trpc/errors";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";
import * as v from "valibot";

const createFlyerInput = v.object({
  businessId: v.pipe(v.string(), v.minLength(1)),
  url: v.pipe(v.string(), v.url()),
});

const updateFlyerInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  url: v.optional(v.pipe(v.string(), v.url())),
});

export type FlyersRouterDeps = {
  readonly flyer: FlyerRepository;
  readonly business: BusinessRepository;
};

export function createFlyersRouter(deps: FlyersRouterDeps) {
  const { flyer: repository, business } = deps;

  return router({
    list: publicProcedure.query(async () => repository.list()),

    getById: publicProcedure
      .input(requiredId("Flyer id is required"))
      .query(async ({ input }) => requireFound(await repository.getById(input), "Flyer not found")),

    create: protectedProcedure.input(createFlyerInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      return repository.create(input);
    }),

    update: protectedProcedure.input(updateFlyerInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const current = requireFound(await repository.getById(id), "Flyer not found");

      await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

      return requireFound(await repository.update(id, rest), "Flyer not found");
    }),

    delete: protectedProcedure
      .input(requiredId("Flyer id is required"))
      .mutation(async ({ input, ctx }) => {
        const current = requireFound(await repository.getById(input), "Flyer not found");

        await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

        if (!(await repository.delete(input))) {
          throw new NotFoundError("Flyer not found");
        }

        return true;
      }),
  });
}
