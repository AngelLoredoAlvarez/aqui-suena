import type { ProductRepository } from "@aqui-suena/api/domain/directory/product";
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

export function createProductsRouter(repository: ProductRepository) {
  return router({
    list: publicProcedure.query(async () => repository.list()),

    getById: publicProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Product id is required");
        return value;
      })
      .query(async ({ input }) => repository.getById(input)),

    create: protectedProcedure
      .input(createProductInput)
      .mutation(async ({ input }) => repository.create(input)),

    update: protectedProcedure.input(updateProductInput).mutation(async ({ input }) => {
      const { id, ...rest } = input;
      return repository.update(id, rest);
    }),

    delete: protectedProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Product id is required");
        return value;
      })
      .mutation(async ({ input }) => repository.delete(input)),
  });
}
