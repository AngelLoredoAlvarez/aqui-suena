import type { ServiceRepository } from "@aqui-suena/api/domain/directory/service";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
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

export function createServicesRouter(repository: ServiceRepository) {
  return router({
    list: publicProcedure.query(async () => repository.list()),

    getById: publicProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Service id is required");
        return value;
      })
      .query(async ({ input }) => repository.getById(input)),

    create: protectedProcedure
      .input(createServiceInput)
      .mutation(async ({ input }) => repository.create(input)),

    update: protectedProcedure.input(updateServiceInput).mutation(async ({ input }) => {
      const { id, ...rest } = input;
      return repository.update(id, rest);
    }),

    delete: protectedProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Service id is required");
        return value;
      })
      .mutation(async ({ input }) => repository.delete(input)),
  });
}
