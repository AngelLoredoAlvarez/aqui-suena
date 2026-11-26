import {
  type NewPayment,
  parsePaymentMethod,
  parsePaymentProvider,
  parsePaymentStatus,
} from "@aqui-suena/api/domain/billing/payments/model/payment";
import { InMemoryPaymentRepository } from "@aqui-suena/api/infrastructure/memory/billing/in-memory-payment-repository";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

const PERIOD_START = new Date("2026-11-19T12:00:00Z");
const PERIOD_END = new Date("2026-12-19T12:00:00Z");

function newPayment(overrides: Partial<NewPayment> = {}): NewPayment {
  return {
    accountId: "acc-1",
    planId: "trades",
    billingInterval: "monthly",
    method: "card",
    idempotencyKey: "idem-1",
    amount: 9900,
    currency: "MXN",
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    ...overrides,
  };
}

describe("parsePaymentStatus", () => {
  it.each(["pending", "completed", "failed", "expired", "refunded"])(
    "accepts the valid status %s",
    (status) => {
      expect(parsePaymentStatus(status)).toBe(status);
    },
  );

  it.each(["unknown", "", "PAID"])("rejects the unknown status %s", (value) => {
    expect(() => parsePaymentStatus(value)).toThrow(DataIntegrityError);
  });

  it.each([null, 3, {}])("rejects the non-string value %s", (value) => {
    expect(() => parsePaymentStatus(value)).toThrow(DataIntegrityError);
  });

  it("carries the field and the offending value", () => {
    let thrown: unknown;

    try {
      parsePaymentStatus("unknown");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(DataIntegrityError);
    expect(thrown).toMatchObject({ field: "status", value: "unknown" });
  });
});

describe("payment enum parsers", () => {
  it("accepts every payment method", () => {
    expect(parsePaymentMethod("card")).toBe("card");
    expect(parsePaymentMethod("cash")).toBe("cash");
    expect(parsePaymentMethod("spei")).toBe("spei");
  });

  it("rejects an unknown payment method", () => {
    expect(() => parsePaymentMethod("unknown")).toThrow(DataIntegrityError);
  });

  it("accepts the known provider", () => {
    expect(parsePaymentProvider("conekta")).toBe("conekta");
  });

  it("rejects an unknown provider", () => {
    expect(() => parsePaymentProvider("stripe")).toThrow(DataIntegrityError);
  });
});

describe("InMemoryPaymentRepository", () => {
  it("creates a pending payment with its period and defaults", async () => {
    const repo = new InMemoryPaymentRepository();

    const payment = await repo.create(newPayment());

    expect(payment).toMatchObject({
      accountId: "acc-1",
      subscriptionId: null,
      planId: "trades",
      billingInterval: "monthly",
      method: "card",
      provider: "conekta",
      providerOrderId: null,
      providerChargeId: null,
      idempotencyKey: "idem-1",
      amount: 9900,
      currency: "MXN",
      status: "pending",
      reference: null,
      nextActionUrl: null,
      expiresAt: null,
      failureReason: null,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      paidAt: null,
    });
    expect(payment.id).toBeTruthy();
    expect(payment.createdAt).toBeInstanceOf(Date);
  });

  it("finds a payment by idempotency key", async () => {
    const repo = new InMemoryPaymentRepository();
    const payment = await repo.create(newPayment());

    expect((await repo.getByIdempotencyKey("idem-1"))?.id).toBe(payment.id);
    expect(await repo.getByIdempotencyKey("missing")).toBeNull();
  });

  it("applies a provider result and finds it by provider order id", async () => {
    const repo = new InMemoryPaymentRepository();
    const payment = await repo.create(newPayment());
    const expiresAt = new Date("2026-11-26T12:00:00Z");

    await repo.applyProviderResult(payment.id, {
      providerOrderId: "ord-1",
      providerChargeId: "chg-1",
      reference: "ref-1",
      nextActionUrl: "https://3ds.example/1",
      expiresAt,
      failureReason: null,
    });

    const stored = await repo.getByProviderOrderId("ord-1");

    expect(stored?.id).toBe(payment.id);
    expect(stored).toMatchObject({
      providerChargeId: "chg-1",
      reference: "ref-1",
      nextActionUrl: "https://3ds.example/1",
      expiresAt,
    });
  });

  it("finds the last open intent for the same account, plan, interval and method", async () => {
    const repo = new InMemoryPaymentRepository();
    const first = await repo.create(newPayment({ idempotencyKey: "idem-1" }));
    const second = await repo.create(newPayment({ idempotencyKey: "idem-2" }));

    const open = await repo.findOpenIntent({
      accountId: "acc-1",
      planId: "trades",
      billingInterval: "monthly",
      method: "card",
    });

    expect(open?.id).toBe(second.id);
    expect(open?.id).not.toBe(first.id);
    expect(
      await repo.findOpenIntent({
        accountId: "acc-1",
        planId: "commerce",
        billingInterval: "monthly",
        method: "card",
      }),
    ).toBeNull();
  });

  it("claims completion once", async () => {
    const repo = new InMemoryPaymentRepository();
    const payment = await repo.create(newPayment());
    const paidAt = new Date("2026-11-19T13:00:00Z");

    expect(await repo.claimCompletion(payment.id, paidAt)).toBe(true);
    expect(await repo.claimCompletion(payment.id, paidAt)).toBe(false);
    expect(await repo.getById(payment.id)).toMatchObject({
      status: "completed",
      paidAt,
    });
  });

  it("marks a payment failed once", async () => {
    const repo = new InMemoryPaymentRepository();
    const payment = await repo.create(newPayment());
    const at = new Date("2026-11-19T13:00:00Z");

    expect(await repo.markFailed(payment.id, "declined", at)).toBe(true);
    expect(await repo.markFailed(payment.id, "declined", at)).toBe(false);
    expect(await repo.getById(payment.id)).toMatchObject({
      status: "failed",
      failureReason: "declined",
    });
  });

  it("marks a payment expired once", async () => {
    const repo = new InMemoryPaymentRepository();
    const payment = await repo.create(newPayment());
    const at = new Date("2026-11-19T13:00:00Z");

    expect(await repo.markExpired(payment.id, at)).toBe(true);
    expect(await repo.markExpired(payment.id, at)).toBe(false);
    expect((await repo.getById(payment.id))?.status).toBe("expired");
  });

  it("attaches a subscription once", async () => {
    const repo = new InMemoryPaymentRepository();
    const payment = await repo.create(newPayment());

    await repo.attachSubscription(payment.id, "sub-1");
    await repo.attachSubscription(payment.id, "sub-2");

    expect((await repo.getById(payment.id))?.subscriptionId).toBe("sub-1");
  });

  it("lists pending payments with a provider order up to the limit", async () => {
    const repo = new InMemoryPaymentRepository();
    const first = await repo.create(newPayment({ idempotencyKey: "idem-1" }));
    const second = await repo.create(newPayment({ idempotencyKey: "idem-2" }));
    await repo.create(newPayment({ idempotencyKey: "idem-3" }));

    for (const [index, payment] of [first, second].entries()) {
      await repo.applyProviderResult(payment.id, {
        providerOrderId: `ord-${index}`,
        providerChargeId: null,
        reference: null,
        nextActionUrl: null,
        expiresAt: null,
        failureReason: null,
      });
    }

    const pending = await repo.listPendingWithProviderOrder(1);

    expect(pending).toHaveLength(1);
    expect(pending[0]?.id).toBe(first.id);
  });

  it("lists payments by subscription", async () => {
    const repo = new InMemoryPaymentRepository();
    const first = await repo.create(newPayment({ idempotencyKey: "idem-1" }));
    const second = await repo.create(newPayment({ idempotencyKey: "idem-2" }));
    await repo.create(newPayment({ idempotencyKey: "idem-3" }));

    await repo.attachSubscription(first.id, "sub-1");
    await repo.attachSubscription(second.id, "sub-1");

    expect(await repo.listBySubscription("sub-1")).toHaveLength(2);
  });

  it("returns null for a non-existent payment", async () => {
    const repo = new InMemoryPaymentRepository();

    expect(await repo.getById("missing")).toBeNull();
  });
});
