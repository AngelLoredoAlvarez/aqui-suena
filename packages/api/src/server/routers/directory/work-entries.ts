import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { WorkEntryRepository } from "@aqui-suena/api/domain/directory/work-entry";
import { assertBusinessOwned } from "@aqui-suena/api/server/routers/directory/access";
import { requiredId, requireFound } from "@aqui-suena/api/server/trpc/errors";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";
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
      .input(requiredId("Work entry id is required"))
      .query(async ({ input }) =>
        requireFound(await repository.getById(input), "Work entry not found"),
      ),

    create: protectedProcedure.input(createWorkEntryInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      return repository.create(input);
    }),

    update: protectedProcedure.input(updateWorkEntryInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const current = requireFound(await repository.getById(id), "Work entry not found");

      await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

      return requireFound(await repository.update(id, rest), "Work entry not found");
    }),

    delete: protectedProcedure
      .input(requiredId("Work entry id is required"))
      .mutation(async ({ input, ctx }) => {
        const current = requireFound(await repository.getById(input), "Work entry not found");

        await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

        if (!(await repository.delete(input))) {
          throw new NotFoundError("Work entry not found");
        }

        return true;
      }),
  });
}
