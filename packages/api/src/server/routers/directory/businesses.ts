import { resolvePlan } from "@aqui-suena/api/domain/ads/ad-plan";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions";
import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { businessCategorySchema } from "@aqui-suena/api/domain/directory/listing";
import { assertCanCreateBusiness } from "@aqui-suena/api/entitlements";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/trpc";
import { TRPCError } from "@trpc/server";
import * as v from "valibot";

export type BusinessesRouterDeps = {
  readonly business: BusinessRepository;
  readonly subscription: SubscriptionRepository;
};

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

export function createBusinessesRouter(deps: BusinessesRouterDeps) {
  const { business: repository, subscription: subscriptionRepository } = deps;

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

    create: protectedProcedure.input(createBusinessInput).mutation(async ({ input }) => {
      const subscription = await subscriptionRepository.getActive(input.accountId);
      const plan = resolvePlan(subscription);

      const existing = await repository.listByAccount(input.accountId);

      try {
        assertCanCreateBusiness(plan, existing.length);
      } catch (error) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `UPGRADE_REQUIRED: ${(error as Error).message}`,
        });
      }

      return repository.create(input);
    }),

    update: protectedProcedure.input(updateBusinessInput).mutation(async ({ input }) => {
      const { id, ...rest } = input;
      return repository.update(id, rest);
    }),

    delete: protectedProcedure
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
