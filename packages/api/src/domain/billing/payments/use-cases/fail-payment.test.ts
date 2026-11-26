import type { NewPayment } from "@aqui-suena/api/domain/billing/payments/model/payment";
import { FailPayment } from "@aqui-suena/api/domain/billing/payments/use-cases/fail-payment";
import { InMemoryPaymentRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-payment-repository";
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

describe("FailPayment", () => {
  it("marks a pending payment failed", async () => {
    const payments = new InMemoryPaymentRepository();
    const pending = await payments.create(newPayment());
    const fail = new FailPayment({ payments, now: () => NOW });

    const failed = await fail.execute(pending.id, "owner_cancelled");

    expect(failed.status).toBe("failed");
    expect(failed.failureReason).toBe("owner_cancelled");
  });

  it("does not change a completed payment", async () => {
    const payments = new InMemoryPaymentRepository();
    const completed = await payments.create(newPayment());
    await payments.claimCompletion(completed.id, NOW);
    const fail = new FailPayment({ payments, now: () => NOW });

    const unchanged = await fail.execute(completed.id, "late");

    expect(unchanged.status).toBe("completed");
    expect(unchanged.failureReason).toBeNull();
  });
});
