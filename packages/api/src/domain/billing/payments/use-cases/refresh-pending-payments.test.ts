import type { NewPayment } from "@aqui-suena/api/domain/billing/payments/model/payment";
import { RefreshPendingPayments } from "@aqui-suena/api/domain/billing/payments/use-cases/refresh-pending-payments";
import { InMemoryPaymentRepository } from "@aqui-suena/api/infrastructure/memory/billing/in-memory-payment-repository";
import { FakePaymentProvider } from "@aqui-suena/api/testing/payment-provider";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-19T12:00:00Z");

function newPayment(key: string): NewPayment {
  return {
    accountId: "acc-1",
    planId: "trades",
    billingInterval: "monthly",
    method: "cash",
    idempotencyKey: key,
    amount: 9900,
    currency: "MXN",
    periodStart: NOW,
    periodEnd: new Date("2026-12-19T12:00:00Z"),
  };
}

class FakeService {
  readonly calls: Array<{
    method: "complete" | "fail" | "expire";
    paymentId: string;
    at?: Date;
    reason?: string;
  }> = [];

  readonly complete = {
    execute: async (paymentId: string, paidAt?: Date): Promise<null> => {
      this.calls.push({ method: "complete", paymentId, at: paidAt });
      return null;
    },
  };

  readonly fail = {
    execute: async (paymentId: string, reason: string, at?: Date): Promise<null> => {
      this.calls.push({ method: "fail", paymentId, at, reason });
      return null;
    },
  };

  readonly expire = {
    execute: async (paymentId: string, at?: Date): Promise<null> => {
      this.calls.push({ method: "expire", paymentId, at });
      return null;
    },
  };
}

async function setup() {
  const payments = new InMemoryPaymentRepository();
  const pending = await payments.create(newPayment("idem-1"));

  await payments.applyProviderResult(pending.id, {
    providerOrderId: "ord-1",
    providerChargeId: null,
    reference: "ref-1",
    nextActionUrl: null,
    expiresAt: null,
    failureReason: null,
  });

  const provider = new FakePaymentProvider();
  const service = new FakeService();
  const errors: Array<{ message: string; paymentId: string }> = [];
  const refresh = new RefreshPendingPayments({
    payments,
    provider,
    service,
    now: () => NOW,
    onError: (message, paymentId) => errors.push({ message, paymentId }),
  });

  return { payments, pending, provider, service, errors, refresh };
}

describe("RefreshPendingPayments", () => {
  it("completes a paid order and stops there", async () => {
    const { pending, provider, service, refresh } = await setup();

    expect(await refresh.execute()).toBe(1);
    expect(provider.orderCalls).toEqual(["ord-1"]);
    expect(service.calls).toEqual([{ method: "complete", paymentId: pending.id, at: NOW }]);
  });

  it("fails a declined order with its reason", async () => {
    const { pending, provider, service, refresh } = await setup();

    provider.result = {
      ...provider.result,
      status: "declined",
      failureReason: "insufficient_funds",
    };

    expect(await refresh.execute()).toBe(1);
    expect(service.calls).toEqual([
      {
        method: "fail",
        paymentId: pending.id,
        at: NOW,
        reason: "insufficient_funds",
      },
    ]);
  });

  it("expires an expired order", async () => {
    const { pending, provider, service, refresh } = await setup();

    provider.result = { ...provider.result, status: "expired" };

    expect(await refresh.execute()).toBe(1);
    expect(service.calls).toEqual([{ method: "expire", paymentId: pending.id, at: NOW }]);
  });

  it("leaves a pending order untouched", async () => {
    const { provider, service, refresh } = await setup();

    provider.result = { ...provider.result, status: "pending" };

    expect(await refresh.execute()).toBe(0);
    expect(service.calls).toHaveLength(0);
  });

  it("reports a provider error and continues", async () => {
    const { provider, service, errors, refresh } = await setup();

    provider.error = new Error("conekta down");

    expect(await refresh.execute()).toBe(0);
    expect(service.calls).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe("conekta down");
  });
});
