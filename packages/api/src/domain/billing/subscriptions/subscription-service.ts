import type {
  Subscription,
  SubscriptionRepository,
} from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type { SubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/subscription-notifier";
import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import {
  canChooseVisibleCount,
  hiddenBusinessIds,
  retentionDeadline,
} from "@aqui-suena/api/domain/directory/retention";
import {
  DEFAULT_EMAIL_LOCALE,
  type EmailLocale,
} from "@aqui-suena/api/domain/email/email-template";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { graceDeadline, isInGracePeriod } from "./grace";
import { addMonths } from "./period";

const PERIOD_MONTHS = 1;

export interface SubscriptionServiceDependencies {
  readonly subscriptionRepo: SubscriptionRepository;
  readonly planRepo: PlanRepository;
  readonly businessRepo?: BusinessRepository;
  readonly notifier?: SubscriptionNotifier;
}

export interface SubscriptionNotificationOptions {
  readonly recipientEmail?: string;
  readonly locale?: EmailLocale;
}

export interface SubscriptionPlanChangeOptions extends SubscriptionNotificationOptions {
  readonly visibleBusinessIds?: string[];
  readonly now?: Date;
}

export class SubscriptionService {
  private readonly subscriptionRepo: SubscriptionRepository;
  private readonly planRepo: PlanRepository;
  private readonly businessRepo: BusinessRepository | undefined;
  private readonly notifier: SubscriptionNotifier | undefined;

  constructor(dependencies: SubscriptionServiceDependencies) {
    this.subscriptionRepo = dependencies.subscriptionRepo;
    this.planRepo = dependencies.planRepo;
    this.businessRepo = dependencies.businessRepo;
    this.notifier = dependencies.notifier;
  }

  async subscribe(
    accountId: string,
    planId: PlanId,
    startedAt: Date,
    endsAt: Date,
  ): Promise<Subscription> {
    const existing = await this.subscriptionRepo.listByAccount(accountId);

    for (const sub of existing) {
      if (sub.status === "active") {
        await this.subscriptionRepo.updateStatus(sub.id, "cancelled");
      }
    }

    return this.subscriptionRepo.create(accountId, planId, startedAt, endsAt);
  }

  async changePlan(
    subscriptionId: string,
    newPlanId: PlanId,
    options: SubscriptionPlanChangeOptions = {},
  ): Promise<Subscription> {
    const {
      visibleBusinessIds,
      now = new Date(),
      recipientEmail,
      locale = DEFAULT_EMAIL_LOCALE,
    } = options;

    const current = await this.subscriptionRepo.getById(subscriptionId);

    if (!current) {
      throw new Error("Subscription not found");
    }

    if (current.status !== "active") {
      throw new Error("Subscription is not active");
    }

    const currentPlan = await this.planRepo.getById(current.planId);

    const newPlan = await this.planRepo.getById(newPlanId);

    if (!currentPlan || !newPlan) {
      throw new Error("Plan not found");
    }

    if (current.planId === newPlanId) {
      throw new Error("Already on this plan");
    }

    const isUpgrade = newPlan.entitlements.priority > currentPlan.entitlements.priority;

    if (isUpgrade) {
      await this.subscriptionRepo.updateStatus(subscriptionId, "expired");

      const endsAt = addMonths(now, PERIOD_MONTHS);

      return this.subscriptionRepo.create(current.accountId, newPlanId, now, endsAt);
    }

    // Validate visible selection before any mutation.
    if (this.businessRepo && visibleBusinessIds !== undefined) {
      const selection = canChooseVisibleCount(
        newPlan.entitlements.maxBusinesses,
        visibleBusinessIds.length,
      );

      if (!selection.allowed) {
        throw new Error(`UPGRADE_REQUIRED: ${selection.hint}`);
      }
    }

    await this.subscriptionRepo.updateStatus(subscriptionId, "cancelled");

    const startedAt = current.endsAt ?? now;
    const endsAt = addMonths(startedAt, PERIOD_MONTHS);

    if (this.businessRepo && visibleBusinessIds !== undefined) {
      const businesses = await this.businessRepo.listByAccount(current.accountId);
      const allIds = businesses.map((b) => b.id);
      const toHide = hiddenBusinessIds(allIds, visibleBusinessIds);
      const retainedUntil = retentionDeadline(now);

      for (const id of toHide) {
        await this.businessRepo.update(id, { hiddenAt: now, retainedUntil });
      }
    }

    await this.subscriptionRepo.create(current.accountId, newPlanId, startedAt, endsAt);

    if (this.notifier && recipientEmail) {
      await this.notifier.planDowngraded(
        { email: recipientEmail, locale },
        { planName: newPlan.name },
      );
    }

    return current;
  }

  async cancel(
    subscriptionId: string,
    options: SubscriptionNotificationOptions = {},
  ): Promise<void> {
    const { recipientEmail, locale = DEFAULT_EMAIL_LOCALE } = options;

    const current = await this.subscriptionRepo.getById(subscriptionId);

    if (!current) {
      throw new Error("Subscription not found");
    }

    if (current.status !== "active") {
      throw new Error("Subscription is not active");
    }

    await this.subscriptionRepo.updateStatus(subscriptionId, "cancelled");

    if (this.notifier && recipientEmail && current.endsAt) {
      const plan = await this.planRepo.getById(current.planId);

      await this.notifier.cancelled(
        { email: recipientEmail, locale },
        { planName: plan?.name ?? current.planId, activeUntil: current.endsAt },
      );
    }
  }

  async failRenewal(
    subscriptionId: string,
    failedAt: Date,
    options: SubscriptionNotificationOptions = {},
  ): Promise<void> {
    const { recipientEmail, locale = DEFAULT_EMAIL_LOCALE } = options;

    const current = await this.subscriptionRepo.getById(subscriptionId);

    if (!current) {
      throw new Error("Subscription not found");
    }

    const graceEnd = graceDeadline(failedAt);

    await this.subscriptionRepo.updateStatus(subscriptionId, "grace");

    await this.subscriptionRepo.updateGraceEnd(subscriptionId, graceEnd);

    if (this.notifier && recipientEmail) {
      await this.notifier.renewalFailed({ email: recipientEmail, locale }, { graceEnd });
    }
  }

  async downgradeExpiredGrace(
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

    const current = await this.subscriptionRepo.getById(subscriptionId);

    if (current?.status !== "grace" || !current.graceEnd) return null;

    if (isInGracePeriod(current.graceEnd, now)) return null;

    const managesBusinesses = this.businessRepo !== undefined && visibleBusinessIds !== undefined;
    const notifiesOwner = this.notifier !== undefined && recipientEmail !== undefined;
    const newPlan =
      managesBusinesses || notifiesOwner ? await this.planRepo.getById(newPlanId) : null;

    await this.subscriptionRepo.updateStatus(subscriptionId, "cancelled");

    if (this.businessRepo && visibleBusinessIds !== undefined) {
      const cap = newPlan?.entitlements.maxBusinesses ?? 0;
      const selection = canChooseVisibleCount(cap, visibleBusinessIds.length);

      if (!selection.allowed) throw new Error(`UPGRADE_REQUIRED: ${selection.hint}`);

      const businesses = await this.businessRepo.listByAccount(current.accountId);

      const toHide = hiddenBusinessIds(
        businesses.map((b) => b.id),
        visibleBusinessIds,
      );

      const retainedUntil = retentionDeadline(now);

      for (const id of toHide) {
        await this.businessRepo.update(id, { hiddenAt: now, retainedUntil });
      }
    }

    const endsAt = addMonths(now, PERIOD_MONTHS);
    const newSub = await this.subscriptionRepo.create(current.accountId, newPlanId, now, endsAt);

    if (this.notifier && recipientEmail) {
      await this.notifier.graceExpired(
        { email: recipientEmail, locale },
        { planName: newPlan?.name ?? newPlanId },
      );
    }

    return newSub;
  }
}
