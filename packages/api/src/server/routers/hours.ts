import type { HourRepository } from "@aqui-suena/api/domain/directory/hour";
import { publicProcedure, router } from "@aqui-suena/api/trpc";
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

export function createHoursRouter(repository: HourRepository) {
  return router({
    list: publicProcedure.query(async () => repository.list()),

    getById: publicProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0) throw new Error("Hour id is required");
        return value;
      })
      .query(async ({ input }) => repository.getById(input)),

    create: publicProcedure
      .input(createHourInput)
      .mutation(async ({ input }) => repository.create(input)),

    update: publicProcedure.input(updateHourInput).mutation(async ({ input }) => {
      const { id, ...rest } = input;
      return repository.update(id, rest);
    }),

    delete: publicProcedure
      .input((value: unknown) => {
        if (typeof value !== "string" || value.length === 0) throw new Error("Hour id is required");
        return value;
      })
      .mutation(async ({ input }) => repository.delete(input)),
  });
}
