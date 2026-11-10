import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { FlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import { assertBusinessOwned, notFound } from "@aqui-suena/api/server/routers/directory/access";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
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
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Flyer id is required");
        return value;
      })
      .query(async ({ input }) => repository.getById(input)),

    create: protectedProcedure.input(createFlyerInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      return repository.create(input);
    }),

    update: protectedProcedure.input(updateFlyerInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const current = await repository.getById(id);

      if (current === null) throw notFound();

      await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

      return repository.update(id, rest);
    }),

    delete: protectedProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Flyer id is required");
        return value;
      })
      .mutation(async ({ input, ctx }) => {
        const current = await repository.getById(input);

        if (current === null) throw notFound();

        await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

        return repository.delete(input);
      }),
  });
}
