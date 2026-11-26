import {
  InMemoryPaymentRepository,
  type NewPayment,
} from "@aqui-suena/api/domain/billing/payments/model/payment";
import { hasPendingForOtherPlan } from "@aqui-suena/api/domain/billing/payments/use-cases/has-pending-for-other-plan";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-19T12:00:00Z");

function newPayment(): NewPayment {
  return {
    accountId: "acc-1",
    planId: "trades",
    billingInterval: "monthly",
    method: "cash",
    idempotencyKey: "idem-1",
    amount: 9900,
    currency: "MXN",
    periodStart: NOW,
    periodEnd: new Date("2026-12-19T12:00:00Z"),
  };
}

describe("hasPendingForOtherPlan", () => {
  it("detects a pending payment for another plan and ignores an expired one", async () => {
    const payments = new InMemoryPaymentRepository();
    const pending = await payments.create(newPayment());

    expect(await hasPendingForOtherPlan(payments, "acc-1", "commerce", NOW)).toBe(true);
    expect(await hasPendingForOtherPlan(payments, "acc-1", "trades", NOW)).toBe(false);

    pending.expiresAt = new Date(NOW.getTime() - 1000);

    expect(await hasPendingForOtherPlan(payments, "acc-1", "commerce", NOW)).toBe(false);
  });
});
