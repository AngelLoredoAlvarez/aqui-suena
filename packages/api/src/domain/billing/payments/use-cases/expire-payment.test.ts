import type { NewPayment } from "@aqui-suena/api/domain/billing/payments/model/payment";
import { ExpirePayment } from "@aqui-suena/api/domain/billing/payments/use-cases/expire-payment";
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

describe("ExpirePayment", () => {
  it("marks a pending payment expired", async () => {
    const payments = new InMemoryPaymentRepository();
    const pending = await payments.create(newPayment());
    const expire = new ExpirePayment({ payments, now: () => NOW });

    const expired = await expire.execute(pending.id);

    expect(expired.status).toBe("expired");
  });
});
