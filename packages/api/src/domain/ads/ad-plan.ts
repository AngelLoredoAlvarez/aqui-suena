import type { Subscription } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";

export function resolvePlan(subscription: Subscription | null): PlanId {
  if (!subscription) return "community";

  if (subscription.status !== "active") return "community";

  const now = new Date();

  if (subscription.startedAt > now) return "community";

  if (subscription.endsAt !== null && subscription.endsAt <= now) return "community";

  return subscription.planId;
}
