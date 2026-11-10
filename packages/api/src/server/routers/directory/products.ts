import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { ProductRepository } from "@aqui-suena/api/domain/directory/product";
import { assertBusinessOwned, notFound } from "@aqui-suena/api/server/routers/directory/access";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
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
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Product id is required");
        return value;
      })
      .query(async ({ input }) => repository.getById(input)),

    create: protectedProcedure.input(createProductInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      return repository.create(input);
    }),

    update: protectedProcedure.input(updateProductInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const current = await repository.getById(id);

      if (current === null) throw notFound();

      await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

      return repository.update(id, rest);
    }),

    delete: protectedProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Product id is required");
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
