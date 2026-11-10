import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { WorkEntryRepository } from "@aqui-suena/api/domain/directory/work-entry";
import { assertBusinessOwned, notFound } from "@aqui-suena/api/server/routers/directory/access";
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

export type WorkEntriesRouterDeps = {
  readonly workEntry: WorkEntryRepository;
  readonly business: BusinessRepository;
};

export function createWorkEntriesRouter(deps: WorkEntriesRouterDeps) {
  const { workEntry: repository, business } = deps;

  return router({
    list: publicProcedure.query(async () => repository.list()),

    getById: publicProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Work entry id is required");
        return value;
      })
      .query(async ({ input }) => repository.getById(input)),

    create: protectedProcedure.input(createWorkEntryInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      return repository.create(input);
    }),

    update: protectedProcedure.input(updateWorkEntryInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const current = await repository.getById(id);

      if (current === null) throw notFound();

      await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

      return repository.update(id, rest);
    }),

    delete: protectedProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0)
          throw new Error("Work entry id is required");
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
