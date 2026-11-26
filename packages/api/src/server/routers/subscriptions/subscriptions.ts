import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/model/subscription";
import type { SubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/ports/subscription-notifier";
import { CancelSubscription } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/cancel";
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
  const cancelSubscription = new CancelSubscription({
    subscriptions: deps.subscription,
    plans: deps.plan,
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

      await cancelSubscription.execute(active.id, {
        recipientEmail: account.email,
        locale: account.locale,
      });
    }),
  });
}
