import type { FlyerRepository } from "@aqui-suena/api/domain/directory/flyer";
import { publicProcedure, router } from "@aqui-suena/api/trpc";
import * as v from "valibot";

const createFlyerInput = v.object({
  businessId: v.pipe(v.string(), v.minLength(1)),
  url: v.pipe(v.string(), v.url()),
});

const updateFlyerInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  url: v.optional(v.pipe(v.string(), v.url())),
});

export function createFlyersRouter(repository: FlyerRepository) {
  return router({
    list: publicProcedure.query(async () => repository.list()),

    getById: publicProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Flyer id is required");
        return value;
      })
      .query(async ({ input }) => repository.getById(input)),

    create: publicProcedure
      .input(createFlyerInput)
      .mutation(async ({ input }) => repository.create(input)),

    update: publicProcedure.input(updateFlyerInput).mutation(async ({ input }) => {
      const { id, ...rest } = input;
      return repository.update(id, rest);
    }),

    delete: publicProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Flyer id is required");
        return value;
      })
      .mutation(async ({ input }) => repository.delete(input)),
  });
}
