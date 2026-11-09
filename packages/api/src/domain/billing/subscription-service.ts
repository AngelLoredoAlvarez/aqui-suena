import {
  canChooseVisibleCount,
  graceDeadline,
  hiddenBusinessIds,
  isInGracePeriod,
  retentionDeadline,
} from "@aqui-suena/api/domain/billing/downgrade";
import type { EmailSender } from "@aqui-suena/api/domain/billing/email";
import type { PlanRepository } from "@aqui-suena/api/domain/billing/plans";
import type {
  Subscription,
  SubscriptionRepository,
} from "@aqui-suena/api/domain/billing/subscriptions";
import type { BusinessRepository } from "@aqui-suena/api/domain/directory/business";
import type { PlanId } from "@aqui-suena/api/entitlements";

const PERIOD_MONTHS = 1;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export class SubscriptionService {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly planRepo: PlanRepository,
    private readonly businessRepo?: BusinessRepository,
    private readonly emailSender?: EmailSender,
  ) {}

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
    visibleBusinessIds?: string[],
    now: Date = new Date(),
    recipientEmail?: string,
  ): Promise<Subscription> {
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

      const now = new Date();
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

    // Send downgrade notification (best-effort: email is a side effect).
    if (this.emailSender && recipientEmail) {
      await this.emailSender.send({
        to: recipientEmail,
        subject: "Tu plan ha sido degradado",
        html: [
          `<p>Tu plan ha sido degradado a <strong>${newPlan.name}</strong>.</p>`,
          "<p>Si tenías negocios en exceso, han sido ocultados pero se conservan por 90 días.</p>",
          "<p>Podés volver a subir de plan en cualquier momento para restaurar el acceso completo.</p>",
        ].join(""),
      });
    }

    return current;
  }

  async cancel(subscriptionId: string): Promise<void> {
    const current = await this.subscriptionRepo.getById(subscriptionId);

    if (!current) {
      throw new Error("Subscription not found");
    }

    if (current.status !== "active") {
      throw new Error("Subscription is not active");
    }

    await this.subscriptionRepo.updateStatus(subscriptionId, "cancelled");
  }

  async failRenewal(
    subscriptionId: string,
    failedAt: Date,
    recipientEmail?: string,
  ): Promise<void> {
    const current = await this.subscriptionRepo.getById(subscriptionId);

    if (!current) {
      throw new Error("Subscription not found");
    }

    await this.subscriptionRepo.updateStatus(subscriptionId, "grace");

    await this.subscriptionRepo.updateGraceEnd(subscriptionId, graceDeadline(failedAt));

    if (this.emailSender && recipientEmail) {
      const graceEnd = graceDeadline(failedAt);

      await this.emailSender.send({
        to: recipientEmail,
        subject: "Tu pago falló — periodo de gracia de 7 días",
        html: [
          "<p>Tu pago recurrente no se pudo procesar.</p>",
          `<p>Tenés hasta el <strong>${graceEnd.toISOString().slice(0, 10)}</strong> `,
          "para regularizar tu pago. Después de esa fecha, tu plan se degradará ",
          "automáticamente al plan Comunidad.</p>",
          "<p>Si creés que es un error, contactá a soporte.</p>",
        ].join(""),
      });
    }
  }

  async downgradeExpiredGrace(
    subscriptionId: string,
    newPlanId: PlanId,
    now: Date = new Date(),
    visibleBusinessIds?: string[],
    recipientEmail?: string,
  ): Promise<Subscription | null> {
    const current = await this.subscriptionRepo.getById(subscriptionId);

    if (current?.status !== "grace" || !current.graceEnd) return null;

    if (isInGracePeriod(current.graceEnd, now)) return null;

    await this.subscriptionRepo.updateStatus(subscriptionId, "cancelled");

    if (this.businessRepo && visibleBusinessIds !== undefined) {
      const newPlan = await this.planRepo.getById(newPlanId);
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

    // Send downgrade notification (best-effort: email is a side effect).
    if (this.emailSender && recipientEmail) {
      const plan = await this.planRepo.getById(newPlanId);
      await this.emailSender.send({
        to: recipientEmail,
        subject: "Tu plan ha sido degradado",
        html: [
          `<p>Tu plan ha sido degradado a <strong>${plan?.name ?? newPlanId}</strong>.</p>`,
          "<p>Tu periodo de gracia expiró. Si tenías negocios en exceso, han sido ocultados pero se conservan por 90 días.</p>",
          "<p>Podés volver a subir de plan en cualquier momento para restaurar el acceso completo.</p>",
        ].join(""),
      });
    }

    return newSub;
  }
}
