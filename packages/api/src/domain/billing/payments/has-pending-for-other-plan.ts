import type { PaymentRepository } from "@aqui-suena/api/domain/billing/payments/payment";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";

/**
 * True when the account already has an open intent for a different plan. A
 * same-plan intent, or an intent that has already expired, does not block a new
 * checkout.
 */
export async function hasPendingForOtherPlan(
  payments: Pick<PaymentRepository, "listPendingByAccount">,
  accountId: string,
  planId: PlanId,
  now: Date,
): Promise<boolean> {
  const pending = await payments.listPendingByAccount(accountId);

  return pending.some(
    (payment) =>
      payment.planId !== null &&
      payment.planId !== planId &&
      (payment.expiresAt === null || payment.expiresAt > now),
  );
}
