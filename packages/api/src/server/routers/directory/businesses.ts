import { resolvePlan } from "@aqui-suena/api/domain/ads/ad-plan";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { businessCategorySchema } from "@aqui-suena/api/domain/directory/contracts/listing";
import { assertCanCreateBusiness } from "@aqui-suena/api/domain/plans/entitlements";
import { assertBusinessOwned } from "@aqui-suena/api/server/routers/directory/access";
import { requiredId, requireFound } from "@aqui-suena/api/server/trpc/errors";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";
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

    listMine: protectedProcedure.query(async ({ ctx }) => {
      return repository.listByAccount(ctx.user.accountId);
    }),

    getMine: protectedProcedure
      .input(requiredId("Business id is required"))
      .query(async ({ input, ctx }) => {
        const business = await repository.getByIdForOwner(input);

        if (business === null || business.accountId !== ctx.user.accountId) {
          throw new NotFoundError("Business not found");
        }

        return business;
      }),

    getById: publicProcedure
      .input(requiredId("Business id is required"))
      .query(async ({ input }) => {
        return requireFound(await repository.getById(input), "Business not found");
      }),

    create: protectedProcedure.input(createBusinessInput).mutation(async ({ input, ctx }) => {
      // Never trust a client-supplied accountId: a business always belongs to
      // the authenticated account.
      const accountId = ctx.user.accountId;
      const subscription = await subscriptionRepository.getActive(accountId);
      const plan = resolvePlan(subscription);

      const existing = await repository.listByAccount(accountId);

      try {
        assertCanCreateBusiness(plan, existing.length);
      } catch (error) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `UPGRADE_REQUIRED: ${(error as Error).message}`,
        });
      }

      return repository.create({ ...input, accountId });
    }),

    update: protectedProcedure.input(updateBusinessInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      await assertBusinessOwned(repository, ctx.user.accountId, id);

      return requireFound(await repository.update(id, rest), "Business not found");
    }),

    delete: protectedProcedure
      .input(requiredId("Business id is required"))
      .mutation(async ({ input, ctx }) => {
        await assertBusinessOwned(repository, ctx.user.accountId, input);

        if (!(await repository.delete(input))) {
          throw new NotFoundError("Business not found");
        }

        return true;
      }),
  });
}
