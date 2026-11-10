import { resolvePlan } from "@aqui-suena/api/domain/ads/ad-plan";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { ProductRepository } from "@aqui-suena/api/domain/directory/product";
import {
  assertCanCreateProduct,
  isWithinProductQuota,
  UPGRADE_HINTS,
  UpgradeRequired,
} from "@aqui-suena/api/domain/plans/entitlements";
import { assertBusinessOwned } from "@aqui-suena/api/server/routers/directory/access";
import { requiredId, requireFound } from "@aqui-suena/api/server/trpc/errors";
import { protectedProcedure, publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { TRPCError } from "@trpc/server";
import * as v from "valibot";

const createProductInput = v.object({
  businessId: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.nullable(v.string()),
  price: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

const updateProductInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.optional(v.pipe(v.string(), v.minLength(1))),
  description: v.optional(v.nullable(v.string())),
  price: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
});

export type ProductsRouterDeps = {
  readonly product: ProductRepository;
  readonly business: BusinessRepository;
  readonly subscription: SubscriptionRepository;
};

export function createProductsRouter(deps: ProductsRouterDeps) {
  const { product: repository, business, subscription: subscriptionRepository } = deps;

  return router({
    list: publicProcedure.query(async () => repository.list()),

    getById: publicProcedure
      .input(requiredId("Product id is required"))
      .query(async ({ input }) =>
        requireFound(await repository.getById(input), "Product not found"),
      ),

    create: protectedProcedure.input(createProductInput).mutation(async ({ input, ctx }) => {
      // Ownership first: a foreign or missing business must answer NOT_FOUND
      // before any plan check, so the response never reveals that it exists.
      await assertBusinessOwned(business, ctx.user.accountId, input.businessId);

      const plan = resolvePlan(await subscriptionRepository.getActive(ctx.user.accountId));

      try {
        assertCanCreateProduct(plan);
      } catch (error) {
        if (error instanceof UpgradeRequired) {
          throw new TRPCError({ code: "FORBIDDEN", message: `UPGRADE_REQUIRED: ${error.hint}` });
        }

        throw error;
      }

      const used = (await repository.listByBusiness(input.businessId)).length;

      if (!isWithinProductQuota(plan, used)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `UPGRADE_REQUIRED: ${UPGRADE_HINTS.productCreate}`,
        });
      }

      return repository.create(input);
    }),

    update: protectedProcedure.input(updateProductInput).mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const current = requireFound(await repository.getById(id), "Product not found");

      await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

      return requireFound(await repository.update(id, rest), "Product not found");
    }),

    delete: protectedProcedure
      .input(requiredId("Product id is required"))
      .mutation(async ({ input, ctx }) => {
        const current = requireFound(await repository.getById(input), "Product not found");

        await assertBusinessOwned(business, ctx.user.accountId, current.businessId);

        if (!(await repository.delete(input))) {
          throw new NotFoundError("Product not found");
        }

        return true;
      }),
  });
}
