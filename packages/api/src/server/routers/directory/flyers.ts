import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { FlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import { assertBusinessOwned } from "@aqui-suena/api/server/routers/directory/access";
import { findOwned } from "@aqui-suena/api/server/routers/directory/child-resource";
import { idInput, requireFound } from "@aqui-suena/api/server/trpc/errors";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { cursorInputSchema } from "@aqui-suena/api/shared/pagination/input";
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
    list: publicProcedure
      .input(v.optional(cursorInputSchema, { limit: 20 }))
      .query(async ({ input }) => {
        return repository.list({ limit: input.limit, cursor: input.cursor ?? null });
      }),

    getById: publicProcedure
      .input(idInput("Flyer id is required"))
      .query(async ({ input }) =>
        requireFound(await repository.getById(input.id), "Flyer not found"),
      ),

    create: protectedProcedure.input(createFlyerInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      return repository.create(input);
    }),

    update: protectedProcedure.input(updateFlyerInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;

      await findOwned(
        (childId) => repository.getById(childId),
        business,
        ctx.user.accountId,
        id,
        "Flyer not found",
      );

      return requireFound(await repository.update(id, rest), "Flyer not found");
    }),

    delete: protectedProcedure
      .input(idInput("Flyer id is required"))
      .mutation(async ({ input, ctx }) => {
        await findOwned(
          (childId) => repository.getById(childId),
          business,
          ctx.user.accountId,
          input.id,
          "Flyer not found",
        );

        if (!(await repository.delete(input.id))) {
          throw new NotFoundError("Flyer not found");
        }

        return true;
      }),
  });
}
