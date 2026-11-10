import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { HourRepository } from "@aqui-suena/api/domain/directory/hour";
import { assertBusinessOwned, notFound } from "@aqui-suena/api/server/routers/directory/access";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
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
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0) throw new Error("Hour id is required");
        return value;
      })
      .query(async ({ input }) => repository.getById(input)),

    create: protectedProcedure.input(createHourInput).mutation(async ({ input, ctx }) => {
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      return repository.create(input);
    }),

    update: protectedProcedure.input(updateHourInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const current = await repository.getById(id);

      if (current === null) throw notFound();

      await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

      return repository.update(id, rest);
    }),

    delete: protectedProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0) throw new Error("Hour id is required");
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
