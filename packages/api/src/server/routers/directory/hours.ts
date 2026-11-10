import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { HourRepository } from "@aqui-suena/api/domain/directory/hour";
import { assertBusinessOwned } from "@aqui-suena/api/server/routers/directory/access";
import { requiredId, requireFound } from "@aqui-suena/api/server/trpc/errors";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";
import * as v from "valibot";

const createHourInput = v.object({
  businessId: v.pipe(v.string(), v.minLength(1)),
  day: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(6)),
  openMinute: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1439)),
  closeMinute: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1439)),
});

const updateHourInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  day: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(6))),
  openMinute: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1439))),
  closeMinute: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1439))),
});

export type HoursRouterDeps = {
  readonly hour: HourRepository;
  readonly business: BusinessRepository;
};

export function createHoursRouter(deps: HoursRouterDeps) {
  const { hour: repository, business } = deps;

  return router({
    list: publicProcedure.query(async () => repository.list()),

    getById: publicProcedure
      .input(requiredId("Hour id is required"))
      .query(async ({ input }) => requireFound(await repository.getById(input), "Hour not found")),

    create: protectedProcedure.input(createHourInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      return repository.create(input);
    }),

    update: protectedProcedure.input(updateHourInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const current = requireFound(await repository.getById(id), "Hour not found");

      await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

      return requireFound(await repository.update(id, rest), "Hour not found");
    }),

    delete: protectedProcedure
      .input(requiredId("Hour id is required"))
      .mutation(async ({ input, ctx }) => {
        const current = requireFound(await repository.getById(input), "Hour not found");

        await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

        if (!(await repository.delete(input))) {
          throw new NotFoundError("Hour not found");
        }

        return true;
      }),
  });
}
