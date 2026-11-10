import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { ProductRepository } from "@aqui-suena/api/domain/directory/product";
import { assertBusinessOwned } from "@aqui-suena/api/server/routers/directory/access";
import { requiredId, requireFound } from "@aqui-suena/api/server/trpc/errors";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";
import * as v from "valibot";

const createProductInput = v.object({
  businessId: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.nullable(v.string()),
  price: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

const updateProductInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.optional(v.pipe(v.string(), v.minLength(1))),
  description: v.optional(v.nullable(v.string())),
  price: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
});

export type ProductsRouterDeps = {
  readonly product: ProductRepository;
  readonly business: BusinessRepository;
};

export function createProductsRouter(deps: ProductsRouterDeps) {
  const { product: repository, business } = deps;

  return router({
    list: publicProcedure.query(async () => repository.list()),

    getById: publicProcedure
      .input(requiredId("Product id is required"))
      .query(async ({ input }) =>
        requireFound(await repository.getById(input), "Product not found"),
      ),

    create: protectedProcedure.input(createProductInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      return repository.create(input);
    }),

    update: protectedProcedure.input(updateProductInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const current = requireFound(await repository.getById(id), "Product not found");

      await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

      return requireFound(await repository.update(id, rest), "Product not found");
    }),

    delete: protectedProcedure
      .input(requiredId("Product id is required"))
      .mutation(async ({ input, ctx }) => {
        const current = requireFound(await repository.getById(input), "Product not found");

        await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

        if (!(await repository.delete(input))) {
          throw new NotFoundError("Product not found");
        }

        return true;
      }),
  });
}
