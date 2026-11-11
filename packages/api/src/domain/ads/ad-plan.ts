import { isInGracePeriod } from "@aqui-suena/api/domain/billing/subscriptions/grace";
import type { Subscription } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";

export function resolvePlan(subscription: Subscription | null, now: Date = new Date()): PlanId {
  if (!subscription) return "community";

  if (subscription.startedAt > now) return "community";

  switch (subscription.status) {
    case "active":
      return subscription.endsAt !== null && subscription.endsAt <= now
        ? "community"
        : subscription.planId;

    case "cancelled":
      // Cancellation stops renewal; the paid plan stays until the period ends.
      return subscription.endsAt !== null && subscription.endsAt > now
        ? subscription.planId
        : "community";

    case "grace":
      // Failed renewal: the plan stays usable for the 7-day grace window.
      return subscription.graceEnd !== null && isInGracePeriod(subscription.graceEnd, now)
        ? subscription.planId
        : "community";

    case "expired":
      return "community";
  }
}
