import type { WorkEntryRepository } from "@aqui-suena/api/domain/directory/work-entry";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import * as v from "valibot";

const createWorkEntryInput = v.object({
  businessId: v.pipe(v.string(), v.minLength(1)),
  title: v.pipe(v.string(), v.minLength(1)),
  description: v.nullable(v.string()),
});

const updateWorkEntryInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  title: v.optional(v.pipe(v.string(), v.minLength(1))),
  description: v.optional(v.nullable(v.string())),
});

export function createWorkEntriesRouter(repository: WorkEntryRepository) {
  return router({
    list: publicProcedure.query(async () => repository.list()),

    getById: publicProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Work entry id is required");
        return value;
      })
      .query(async ({ input }) => repository.getById(input)),

    create: protectedProcedure
      .input(createWorkEntryInput)
      .mutation(async ({ input }) => repository.create(input)),

    update: protectedProcedure.input(updateWorkEntryInput).mutation(async ({ input }) => {
      const { id, ...rest } = input;
      return repository.update(id, rest);
    }),

    delete: protectedProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Work entry id is required");
        return value;
      })
      .mutation(async ({ input }) => repository.delete(input)),
  });
}
