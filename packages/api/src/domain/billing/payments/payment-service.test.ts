import { InMemoryAccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import {
  InMemoryPaymentRepository,
  type Payment,
} from "@aqui-suena/api/domain/billing/payments/payment";
import type { ChargeResult } from "@aqui-suena/api/domain/billing/payments/payment-provider";
import {
  type CreatePaymentInput,
  PaymentService,
} from "@aqui-suena/api/domain/billing/payments/payment-service";
import { plans as planFixtures } from "@aqui-suena/api/domain/billing/subscriptions/fixtures";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { ConflictError, NotFoundError, ValidationError } from "@aqui-suena/api/shared/domain-error";
import { FakePaymentNotifier } from "@aqui-suena/api/testing/notifiers";
import { FakePaymentCardWriter } from "@aqui-suena/api/testing/payment-card-writer";
import { FakePaymentProvider } from "@aqui-suena/api/testing/payment-provider";
import { FakePaymentSubscriptionWriter } from "@aqui-suena/api/testing/payment-subscription-writer";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-19T12:00:00Z");
const PERIOD_START = NOW;
const PERIOD_END = new Date("2026-12-19T12:00:00Z");
const ANNUAL_END = new Date("2027-11-19T12:00:00Z");
const CUSTOMER = { name: "Ana", email: "ana@example.com", phone: "+5215555555555" };

function paidResult(): ChargeResult {
  return {
    providerOrderId: "ord-1",
    providerChargeId: "chg-1",
    status: "paid",
    reference: null,
    nextActionUrl: null,
    expiresAt: null,
    failureReason: null,
  };
}

function pendingResult(reference: string | null, expiresAt: Date | null): ChargeResult {
  return {
    providerOrderId: "ord-1",
    providerChargeId: null,
    status: "pending",
    reference,
    nextActionUrl: null,
    expiresAt,
    failureReason: null,
  };
}

function baseInput(overrides: Partial<CreatePaymentInput> = {}): CreatePaymentInput {
  return {
    accountId: "acc-1",
    planId: "trades",
    billingInterval: "monthly",
    method: "card",
    idempotencyKey: "idem-1",
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    customer: CUSTOMER,
    cardToken: "tok-1",
    ...overrides,
  };
}

function setup(
  options: {
    accountDeleted?: boolean;
    notifier?: FakePaymentNotifier;
    withoutAccount?: boolean;
  } = {},
) {
  const payments = new InMemoryPaymentRepository();
  const provider = new FakePaymentProvider();
  const writer = new FakePaymentSubscriptionWriter();
  const notifier = options.notifier ?? new FakePaymentNotifier();
  const deliveryErrors: Array<{ stage: string; paymentId: string }> = [];
  const accounts = new InMemoryAccountRepository(
    options.withoutAccount
      ? []
      : [
          {
            id: "acc-1",
            email: "owner@example.com",
            planId: "trades",
            locale: "es-MX",
            deletedAt: options.accountDeleted ? new Date("2026-11-18T00:00:00Z") : null,
          },
        ],
  );
  const service = new PaymentService({
    payments,
    plans: new InMemoryPlanRepository(planFixtures),
    provider,
    subscriptions: writer,
    accounts,
    notifier,
    onDeliveryError: (_error, stage, paymentId) => deliveryErrors.push({ stage, paymentId }),
    now: () => NOW,
  });

  return { payments, provider, writer, notifier, deliveryErrors, service };
}

async function createPendingCash(
  service: PaymentService,
  provider: FakePaymentProvider,
  key = "idem-cash",
): Promise<Payment> {
  provider.result = pendingResult("ref-1", new Date("2026-11-26T12:00:00Z"));

  return service.create(
    baseInput({
      idempotencyKey: key,
      method: "cash",
      cardToken: undefined,
    }),
  );
}

describe("PaymentService.create", () => {
  it("charges the monthly price and completes a paid card payment", async () => {
    const { payments, provider, writer, service } = setup();
    const payment = await service.create(baseInput());

    expect(payment).toMatchObject({
      accountId: "acc-1",
      planId: "trades",
      billingInterval: "monthly",
      method: "card",
      amount: 9900,
      currency: "MXN",
      status: "completed",
      subscriptionId: "sub-1",
      paidAt: NOW,
    });
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]).toMatchObject({
      paymentId: payment.id,
      amount: 9900,
      method: "card",
      cardToken: "tok-1",
      description: "Oficios & Servicios",
      idempotencyKey: "idem-1",
    });
    expect(writer.calls).toHaveLength(1);
    expect(writer.calls[0]).toMatchObject({
      paymentId: payment.id,
      accountId: "acc-1",
      planId: "trades",
      billingInterval: "monthly",
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });
    expect((await payments.getById(payment.id))?.subscriptionId).toBe("sub-1");
  });

  it("charges the annual price and keeps a cash payment pending", async () => {
    const { provider, writer, service } = setup();

    provider.result = pendingResult("ref-annual", new Date("2026-12-26T12:00:00Z"));

    const payment = await service.create(
      baseInput({
        billingInterval: "annual",
        method: "cash",
        cardToken: undefined,
        periodEnd: ANNUAL_END,
      }),
    );

    expect(payment).toMatchObject({
      billingInterval: "annual",
      method: "cash",
      amount: 99000,
      status: "pending",
      reference: "ref-annual",
    });
    expect(writer.calls).toHaveLength(0);
  });

  it("creates and saves a card source before charging a token", async () => {
    const payments = new InMemoryPaymentRepository();
    const provider = new FakePaymentProvider();
    const writer = new FakePaymentSubscriptionWriter();
    const cards = new FakePaymentCardWriter();
    const service = new PaymentService({
      payments,
      plans: new InMemoryPlanRepository(planFixtures),
      provider,
      subscriptions: writer,
      cards,
      now: () => NOW,
    });

    provider.cardSource = {
      customerId: "cus-1",
      sourceId: "src-1",
      card: { brand: "visa", last4: "4242", expMonth: 12, expYear: 30 },
    };

    const payment = await service.create(baseInput());

    expect(cards.calls).toEqual([
      {
        accountId: "acc-1",
        card: {
          customerId: "cus-1",
          sourceId: "src-1",
          card: { brand: "visa", last4: "4242", expMonth: 12, expYear: 30 },
        },
      },
    ]);
    expect(provider.calls[0]?.cardToken).toBeUndefined();
    expect(provider.calls[0]?.savedCard).toEqual({
      customerId: "cus-1",
      sourceId: "src-1",
    });
    expect(payment.status).toBe("completed");
  });

  it("keeps a SPEI payment pending with its reference", async () => {
    const { provider, service } = setup();

    provider.result = pendingResult("012345678901234567", new Date("2026-11-26T12:00:00Z"));

    const payment = await service.create(
      baseInput({
        method: "spei",
        cardToken: undefined,
      }),
    );

    expect(payment).toMatchObject({
      method: "spei",
      status: "pending",
      reference: "012345678901234567",
    });
  });

  it("rejects a card payment without a token", async () => {
    const { service } = setup();

    await expect(service.create(baseInput({ cardToken: undefined }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects a free plan", async () => {
    const { service } = setup();

    await expect(service.create(baseInput({ planId: "community" }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects an unknown plan", async () => {
    const { service } = setup();

    await expect(service.create(baseInput({ planId: "unknown" as PlanId }))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("returns the existing payment for the same idempotency key", async () => {
    const { provider, service } = setup();

    const first = await service.create(baseInput());
    const second = await service.create(baseInput({ periodEnd: ANNUAL_END }));

    expect(second.id).toBe(first.id);
    expect(provider.calls).toHaveLength(1);
  });

  it("rejects the same idempotency key with a different plan", async () => {
    const { service } = setup();

    await service.create(baseInput());

    await expect(service.create(baseInput({ planId: "commerce" }))).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("returns the open intent instead of creating a second one", async () => {
    const { provider, service } = setup();

    const first = await createPendingCash(service, provider);
    const second = await service.create(
      baseInput({
        idempotencyKey: "idem-cash-2",
        method: "cash",
        cardToken: undefined,
      }),
    );

    expect(second.id).toBe(first.id);
    expect(provider.calls).toHaveLength(1);
  });

  it("replaces an expired open intent", async () => {
    const { provider, payments, service } = setup();

    provider.result = pendingResult("ref-old", new Date("2026-11-19T11:00:00Z"));

    const expired = await service.create(
      baseInput({
        idempotencyKey: "idem-old",
        method: "cash",
        cardToken: undefined,
      }),
    );

    provider.result = pendingResult("ref-new", new Date("2026-11-26T12:00:00Z"));

    const replacement = await service.create(
      baseInput({
        idempotencyKey: "idem-new",
        method: "cash",
        cardToken: undefined,
      }),
    );

    expect(replacement.id).not.toBe(expired.id);
    expect((await payments.getById(expired.id))?.status).toBe("expired");
    expect(provider.calls).toHaveLength(2);
  });

  it("marks a declined charge failed", async () => {
    const { provider, writer, service } = setup();

    provider.result = {
      ...paidResult(),
      status: "declined",
      failureReason: "insufficient_funds",
    };

    const payment = await service.create(baseInput());

    expect(payment.status).toBe("failed");
    expect(payment.failureReason).toBe("insufficient_funds");
    expect(payment.paidAt).toBeNull();
    expect(writer.calls).toHaveLength(0);
  });

  it("marks an expired charge expired", async () => {
    const { provider, service } = setup();

    provider.result = { ...paidResult(), status: "expired" };

    const payment = await service.create(
      baseInput({
        method: "cash",
        cardToken: undefined,
      }),
    );

    expect(payment.status).toBe("expired");
  });

  it("marks the payment failed and rethrows when the provider fails", async () => {
    const { payments, provider, service } = setup();

    provider.error = new Error("conekta down");

    await expect(service.create(baseInput())).rejects.toThrow("conekta down");
    expect((await payments.getByIdempotencyKey("idem-1"))?.status).toBe("failed");
  });

  it("rejects a period that does not advance", async () => {
    const { service } = setup();

    await expect(service.create(baseInput({ periodEnd: PERIOD_START }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("PaymentService.hasPendingForOtherPlan", () => {
  it("detects a pending payment for another plan", async () => {
    const { provider, service } = setup();
    const pending = await createPendingCash(service, provider);

    expect(await service.hasPendingForOtherPlan("acc-1", "commerce", NOW)).toBe(true);
    expect(await service.hasPendingForOtherPlan("acc-1", "trades", NOW)).toBe(false);

    pending.expiresAt = new Date(NOW.getTime() - 1000);

    expect(await service.hasPendingForOtherPlan("acc-1", "commerce", NOW)).toBe(false);
  });
});

describe("PaymentService.complete", () => {
  it("activates the subscription and records it on the payment", async () => {
    const { provider, writer, service } = setup();
    const pending = await createPendingCash(service, provider);

    const completed = await service.complete(pending.id);

    expect(completed.status).toBe("completed");
    expect(completed.subscriptionId).toBe("sub-1");
    expect(completed.paidAt).toEqual(NOW);
    expect(writer.calls).toHaveLength(1);
    expect(writer.calls[0]).toMatchObject({
      paymentId: pending.id,
      accountId: "acc-1",
      planId: "trades",
      billingInterval: "monthly",
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });
  });

  it("is a no-op when the payment is already completed", async () => {
    const { writer, service } = setup();
    const payment = await service.create(baseInput());

    const completed = await service.complete(payment.id);

    expect(completed.id).toBe(payment.id);
    expect(completed.status).toBe("completed");
    expect(writer.calls).toHaveLength(1);
  });

  it("activates the subscription once when two completions race", async () => {
    const { payments, provider, writer, service } = setup();
    const pending = await createPendingCash(service, provider);

    await Promise.all([service.complete(pending.id), service.complete(pending.id)]);

    expect(writer.calls).toHaveLength(1);
    expect((await payments.getById(pending.id))?.subscriptionId).toBe("sub-1");
  });

  it("releases the claim when activation fails so a retry can complete", async () => {
    const { payments, provider, writer, service } = setup();
    const pending = await createPendingCash(service, provider);

    writer.error = new Error("subscription store failed");

    await expect(service.complete(pending.id)).rejects.toThrow("subscription store failed");

    const released = await payments.getById(pending.id);

    expect(released).toMatchObject({ status: "pending", paidAt: null });

    writer.error = null;

    const completed = await service.complete(pending.id);

    expect(completed).toMatchObject({ status: "completed", subscriptionId: "sub-1" });
  });

  it("repairs a completed payment without a subscription after the delay", async () => {
    const { payments, provider, writer, service } = setup();
    const pending = await createPendingCash(service, provider);

    await payments.claimCompletion(pending.id, NOW);

    const claimed = await payments.getById(pending.id);

    if (claimed === null) throw new Error("payment missing");

    claimed.updatedAt = new Date(NOW.getTime() - 6 * 60 * 1000);

    const completed = await service.complete(pending.id);

    expect(writer.calls).toHaveLength(1);
    expect(completed).toMatchObject({ status: "completed", subscriptionId: "sub-1" });
  });

  it("rejects a non-pending payment", async () => {
    const { provider, service } = setup();

    provider.result = {
      ...paidResult(),
      status: "declined",
      failureReason: "insufficient_funds",
    };

    const failed = await service.create(baseInput());

    await expect(service.complete(failed.id)).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("PaymentService notifications", () => {
  it("emails a receipt after a paid charge", async () => {
    const { notifier, service } = setup();
    const payment = await service.create(baseInput());

    expect(notifier.calls).toHaveLength(1);
    expect(notifier.calls[0]).toMatchObject({
      event: "payment-receipt",
      recipient: { email: "owner@example.com", locale: "es-MX" },
      data: {
        paymentId: payment.id,
        planName: "Oficios & Servicios",
        billingPeriod: "monthly",
        amountMinorUnits: 9900,
        currency: "MXN",
        method: "card",
        paidAt: NOW,
      },
    });
  });

  it("emails the reference and expiry of a pending cash payment", async () => {
    const { provider, notifier, service } = setup();
    const pending = await createPendingCash(service, provider);

    expect(notifier.calls).toHaveLength(1);
    expect(notifier.calls[0]).toMatchObject({
      event: "payment-pending",
      recipient: { email: "owner@example.com", locale: "es-MX" },
      data: {
        paymentId: pending.id,
        planName: "Oficios & Servicios",
        method: "cash",
        amountMinorUnits: 9900,
        currency: "MXN",
        reference: "ref-1",
        expiresAt: new Date("2026-11-26T12:00:00Z"),
        nextActionUrl: null,
      },
    });
  });

  it("emails the 3DS link when the charge needs a challenge", async () => {
    const { provider, notifier, service } = setup();

    provider.result = {
      ...pendingResult(null, null),
      nextActionUrl: "https://3ds.conekta.com/session/1",
    };

    const payment = await service.create(baseInput());

    expect(notifier.calls[0]).toMatchObject({
      event: "payment-pending",
      data: {
        paymentId: payment.id,
        method: "card",
        reference: null,
        nextActionUrl: "https://3ds.conekta.com/session/1",
      },
    });
  });

  it("never emails a deleted account", async () => {
    const { notifier, service } = setup({ accountDeleted: true });

    await service.create(baseInput());

    expect(notifier.calls).toHaveLength(0);
  });

  it("completes the payment when email delivery fails", async () => {
    const failing = new FakePaymentNotifier(new Error("Resend API error 500"));

    const { deliveryErrors, service } = setup({ notifier: failing });

    const payment = await service.create(baseInput());

    expect(payment.status).toBe("completed");
    expect(deliveryErrors).toEqual([{ stage: "receipt", paymentId: payment.id }]);
  });
});

describe("PaymentService.fail and expire", () => {
  it("marks a pending payment failed", async () => {
    const { provider, service } = setup();
    const pending = await createPendingCash(service, provider);

    const failed = await service.fail(pending.id, "owner_cancelled");

    expect(failed.status).toBe("failed");
    expect(failed.failureReason).toBe("owner_cancelled");
  });

  it("marks a pending payment expired", async () => {
    const { provider, service } = setup();
    const pending = await createPendingCash(service, provider);

    const expired = await service.expire(pending.id);

    expect(expired.status).toBe("expired");
  });

  it("does not change a completed payment", async () => {
    const { service } = setup();
    const completed = await service.create(baseInput());

    const unchanged = await service.fail(completed.id, "late");

    expect(unchanged.status).toBe("completed");
    expect(unchanged.failureReason).toBeNull();
  });
});
