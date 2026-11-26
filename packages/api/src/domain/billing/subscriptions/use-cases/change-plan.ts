import { addInterval } from "@aqui-suena/api/domain/billing/subscriptions/model/period";
import type {
  Subscription,
  SubscriptionRepository,
} from "@aqui-suena/api/domain/billing/subscriptions/model/subscription";
import type { SubscriptionPlanChangeOptions } from "@aqui-suena/api/domain/billing/subscriptions/model/subscription-options";
import type { SubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/ports/subscription-notifier";
import type { BusinessVisibilityRepository } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/business-visibility";
import { hideBusinessesOutsideSelection } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/business-visibility";
import { canChooseVisibleCount } from "@aqui-suena/api/domain/directory/rules/retention";
import { DEFAULT_EMAIL_LOCALE } from "@aqui-suena/api/domain/email/email-template";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { ConflictError, NotFoundError } from "@aqui-suena/api/shared/domain-error";

export type ChangePlanDependencies = {
  readonly subscriptions: SubscriptionRepository;
  readonly plans: PlanRepository;
  readonly businesses?: BusinessVisibilityRepository;
  readonly notifier?: SubscriptionNotifier;
};

export class ChangePlan {
  constructor(private readonly deps: ChangePlanDependencies) {}

  async execute(
    subscriptionId: string,
    newPlanId: PlanId,
    options: SubscriptionPlanChangeOptions = {},
  ): Promise<Subscription> {
    const {
      visibleBusinessIds,
      billingInterval,
      now = new Date(),
      recipientEmail,
      locale = DEFAULT_EMAIL_LOCALE,
    } = options;

    const current = await this.deps.subscriptions.getById(subscriptionId);

    if (!current) {
      throw new NotFoundError("Subscription not found");
    }

    const interval = billingInterval ?? current.billingInterval;

    const paidUntil = current.endsAt !== null && current.endsAt > now ? current.endsAt : null;

    if (current.status !== "active" && !(current.status === "cancelled" && paidUntil !== null)) {
      throw new ConflictError("Subscription is not active");
    }

    const currentPlan = await this.deps.plans.getById(current.planId);

    const newPlan = await this.deps.plans.getById(newPlanId);

    if (!currentPlan || !newPlan) {
      throw new NotFoundError("Plan not found");
    }

    if (current.planId === newPlanId) {
      throw new ConflictError("Already on this plan");
    }

    const isUpgrade = newPlan.entitlements.priority > currentPlan.entitlements.priority;

    if (isUpgrade) {
      await this.deps.subscriptions.updateStatus(subscriptionId, "expired");

      const endsAt = addInterval(paidUntil ?? now, interval);

      return this.deps.subscriptions.create(current.accountId, newPlanId, now, endsAt, interval);
    }

    // Validate visible selection before any mutation.
    if (this.deps.businesses && visibleBusinessIds !== undefined) {
      const selection = canChooseVisibleCount(
        newPlan.entitlements.maxBusinesses,
        visibleBusinessIds.length,
      );

      if (!selection.allowed) {
        throw new ConflictError(`UPGRADE_REQUIRED: ${selection.hint}`);
      }
    }

    await this.deps.subscriptions.updateStatus(subscriptionId, "cancelled");

    const startedAt = current.endsAt ?? now;

    const endsAt = addInterval(startedAt, interval);

    if (this.deps.businesses && visibleBusinessIds !== undefined) {
      await hideBusinessesOutsideSelection(
        this.deps.businesses,
        current.accountId,
        visibleBusinessIds,
        now,
      );
    }

    await this.deps.subscriptions.create(current.accountId, newPlanId, startedAt, endsAt, interval);

    if (this.deps.notifier && recipientEmail) {
      await this.deps.notifier.planDowngraded(
        { email: recipientEmail, locale },
        { planName: newPlan.name },
      );
    }

    return current;
  }
}
