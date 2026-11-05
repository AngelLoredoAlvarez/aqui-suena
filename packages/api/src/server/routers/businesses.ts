import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { businessCategorySchema } from "@aqui-suena/api/domain/directory/listing";
import { publicProcedure, router } from "@aqui-suena/api/trpc";
import * as v from "valibot";

const createBusinessInput = v.object({
  accountId: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  category: businessCategorySchema,
  phone: v.nullable(v.string()),
  email: v.nullable(v.pipe(v.string(), v.email())),
  address: v.nullable(v.string()),
  timezone: v.pipe(v.string(), v.minLength(1)),
  delivery: v.boolean(),
});

const updateBusinessInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.optional(v.pipe(v.string(), v.minLength(1))),
  category: v.optional(businessCategorySchema),
  phone: v.optional(v.nullable(v.string())),
  email: v.optional(v.nullable(v.pipe(v.string(), v.email()))),
  address: v.optional(v.nullable(v.string())),
  timezone: v.optional(v.pipe(v.string(), v.minLength(1))),
  delivery: v.optional(v.boolean()),
});

export function createBusinessesRouter(repository: BusinessRepository) {
  return router({
    list: publicProcedure.query(async () => {
      return repository.list();
    }),

    getById: publicProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0) {
          throw new Error("Business id is required");
        }
        return value;
      })
      .query(async ({ input }) => {
        return repository.getById(input);
      }),

    create: publicProcedure.input(createBusinessInput).mutation(async ({ input }) => {
      return repository.create(input);
    }),

    update: publicProcedure.input(updateBusinessInput).mutation(async ({ input }) => {
      const { id, ...rest } = input;
      return repository.update(id, rest);
    }),

    delete: publicProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0) {
          throw new Error("Business id is required");
        }
        return value;
      })
      .mutation(async ({ input }) => {
        return repository.delete(input);
      }),
  });
}
