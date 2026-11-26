import { isInGracePeriod } from "@aqui-suena/api/domain/billing/subscriptions/model/grace";
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
import { ConflictError } from "@aqui-suena/api/shared/domain-error";

export type DowngradeExpiredGraceDependencies = {
  readonly subscriptions: SubscriptionRepository;
  readonly plans: PlanRepository;
  readonly businesses?: BusinessVisibilityRepository;
  readonly notifier?: SubscriptionNotifier;
};

export class DowngradeExpiredGrace {
  constructor(private readonly deps: DowngradeExpiredGraceDependencies) {}

  async execute(
    subscriptionId: string,
    newPlanId: PlanId,
    options: SubscriptionPlanChangeOptions = {},
  ): Promise<Subscription | null> {
    const {
      visibleBusinessIds,
      now = new Date(),
      recipientEmail,
      locale = DEFAULT_EMAIL_LOCALE,
    } = options;

    const current = await this.deps.subscriptions.getById(subscriptionId);

    if (current?.status !== "grace" || !current.graceEnd) return null;

    if (isInGracePeriod(current.graceEnd, now)) return null;

    const managesBusinesses =
      this.deps.businesses !== undefined && visibleBusinessIds !== undefined;

    const notifiesOwner = this.deps.notifier !== undefined && recipientEmail !== undefined;

    const newPlan =
      managesBusinesses || notifiesOwner ? await this.deps.plans.getById(newPlanId) : null;

    await this.deps.subscriptions.updateStatus(subscriptionId, "cancelled");

    if (this.deps.businesses && visibleBusinessIds !== undefined) {
      const cap = newPlan?.entitlements.maxBusinesses ?? 0;

      const selection = canChooseVisibleCount(cap, visibleBusinessIds.length);

      if (!selection.allowed) throw new ConflictError(`UPGRADE_REQUIRED: ${selection.hint}`);

      await hideBusinessesOutsideSelection(
        this.deps.businesses,
        current.accountId,
        visibleBusinessIds,
        now,
      );
    }

    const endsAt = addInterval(now, "monthly");

    const newSub = await this.deps.subscriptions.create(
      current.accountId,
      newPlanId,
      now,
      endsAt,
      "monthly",
    );

    if (this.deps.notifier && recipientEmail) {
      await this.deps.notifier.graceExpired(
        { email: recipientEmail, locale },
        { planName: newPlan?.name ?? newPlanId },
      );
    }

    return newSub;
  }
}
