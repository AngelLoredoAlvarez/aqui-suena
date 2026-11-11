import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { SubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/subscription-notifier";
import { SubscriptionService } from "@aqui-suena/api/domain/billing/subscriptions/subscription-service";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { protectedProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";

export type SubscriptionsRouterDeps = {
  readonly subscription: SubscriptionRepository;
  readonly plan: PlanRepository;
  readonly account: AccountRepository;
  readonly notifier?: SubscriptionNotifier;
};

export function createSubscriptionsRouter(deps: SubscriptionsRouterDeps) {
  const service = new SubscriptionService({
    subscriptionRepo: deps.subscription,
    planRepo: deps.plan,
    notifier: deps.notifier,
  });

  return router({
    cancel: protectedProcedure.mutation(async ({ ctx }) => {
      const active = await deps.subscription.getActive(ctx.user.accountId);

      if (!active) {
        throw new NotFoundError("No active subscription");
      }

      const account = await deps.account.getById(ctx.user.accountId);

      if (!account) {
        throw new NotFoundError("Account not found");
      }

      await service.cancel(active.id, {
        recipientEmail: account.email,
        locale: account.locale,
      });
    }),
  });
}
