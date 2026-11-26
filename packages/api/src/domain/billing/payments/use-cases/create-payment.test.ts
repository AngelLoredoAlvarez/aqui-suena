import { InMemoryAccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import {
  InMemoryPaymentRepository,
  type Payment,
} from "@aqui-suena/api/domain/billing/payments/model/payment";
import type { ChargeResult } from "@aqui-suena/api/domain/billing/payments/ports/payment-provider";
import { CompletePayment } from "@aqui-suena/api/domain/billing/payments/use-cases/complete-payment";
import {
  CreatePayment,
  type CreatePaymentInput,
} from "@aqui-suena/api/domain/billing/payments/use-cases/create-payment";
import { PaymentNotifications } from "@aqui-suena/api/domain/billing/payments/use-cases/payment-notifications";
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
  const plans = new InMemoryPlanRepository(planFixtures);

  const notifications = new PaymentNotifications({
    payments,
    plans,
    accounts,
    notifier,
    onDeliveryError: (_error, stage, paymentId) => deliveryErrors.push({ stage, paymentId }),
    now: () => NOW,
  });

  const complete = new CompletePayment({
    payments,
    subscriptions: writer,
    notifications,
    now: () => NOW,
  });

  const create = new CreatePayment({
    payments,
    plans,
    provider,
    complete,
    notifications,
    now: () => NOW,
  });

  return { payments, provider, writer, notifier, deliveryErrors, create };
}

async function createPendingCash(
  create: CreatePayment,
  provider: FakePaymentProvider,
  key = "idem-cash",
): Promise<Payment> {
  provider.result = pendingResult("ref-1", new Date("2026-11-26T12:00:00Z"));

  return create.execute(
    baseInput({
      idempotencyKey: key,
      method: "cash",
      cardToken: undefined,
    }),
  );
}

describe("CreatePayment", () => {
  it("charges the monthly price and completes a paid card payment", async () => {
    const { payments, provider, writer, create } = setup();
    const payment = await create.execute(baseInput());

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
    const { provider, writer, create } = setup();

    provider.result = pendingResult("ref-annual", new Date("2026-12-26T12:00:00Z"));

    const payment = await create.execute(
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
    const plans = new InMemoryPlanRepository(planFixtures);
    const notifications = new PaymentNotifications({ payments, plans });
    const complete = new CompletePayment({
      payments,
      subscriptions: writer,
      notifications,
      now: () => NOW,
    });
    const create = new CreatePayment({
      payments,
      plans,
      provider,
      cards,
      complete,
      notifications,
      now: () => NOW,
    });

    provider.cardSource = {
      customerId: "cus-1",
      sourceId: "src-1",
      card: { brand: "visa", last4: "4242", expMonth: 12, expYear: 30 },
    };

    const payment = await create.execute(baseInput());

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
    const { provider, create } = setup();

    provider.result = pendingResult("012345678901234567", new Date("2026-11-26T12:00:00Z"));

    const payment = await create.execute(
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
    const { create } = setup();

    await expect(create.execute(baseInput({ cardToken: undefined }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects a free plan", async () => {
    const { create } = setup();

    await expect(create.execute(baseInput({ planId: "community" }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects an unknown plan", async () => {
    const { create } = setup();

    await expect(create.execute(baseInput({ planId: "unknown" as PlanId }))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("returns the existing payment for the same idempotency key", async () => {
    const { provider, create } = setup();

    const first = await create.execute(baseInput());
    const second = await create.execute(baseInput({ periodEnd: ANNUAL_END }));

    expect(second.id).toBe(first.id);
    expect(provider.calls).toHaveLength(1);
  });

  it("rejects the same idempotency key with a different plan", async () => {
    const { create } = setup();

    await create.execute(baseInput());

    await expect(create.execute(baseInput({ planId: "commerce" }))).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("returns the open intent instead of creating a second one", async () => {
    const { provider, create } = setup();

    const first = await createPendingCash(create, provider);
    const second = await create.execute(
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
    const { provider, payments, create } = setup();

    provider.result = pendingResult("ref-old", new Date("2026-11-19T11:00:00Z"));

    const expired = await create.execute(
      baseInput({
        idempotencyKey: "idem-old",
        method: "cash",
        cardToken: undefined,
      }),
    );

    provider.result = pendingResult("ref-new", new Date("2026-11-26T12:00:00Z"));

    const replacement = await create.execute(
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
    const { provider, writer, create } = setup();

    provider.result = {
      ...paidResult(),
      status: "declined",
      failureReason: "insufficient_funds",
    };

    const payment = await create.execute(baseInput());

    expect(payment.status).toBe("failed");
    expect(payment.failureReason).toBe("insufficient_funds");
    expect(payment.paidAt).toBeNull();
    expect(writer.calls).toHaveLength(0);
  });

  it("marks an expired charge expired", async () => {
    const { provider, create } = setup();

    provider.result = { ...paidResult(), status: "expired" };

    const payment = await create.execute(
      baseInput({
        method: "cash",
        cardToken: undefined,
      }),
    );

    expect(payment.status).toBe("expired");
  });

  it("marks the payment failed and rethrows when the provider fails", async () => {
    const { payments, provider, create } = setup();

    provider.error = new Error("conekta down");

    await expect(create.execute(baseInput())).rejects.toThrow("conekta down");
    expect((await payments.getByIdempotencyKey("idem-1"))?.status).toBe("failed");
  });

  it("rejects a period that does not advance", async () => {
    const { create } = setup();

    await expect(create.execute(baseInput({ periodEnd: PERIOD_START }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("CreatePayment notifications", () => {
  it("emails a receipt after a paid charge", async () => {
    const { notifier, create } = setup();
    const payment = await create.execute(baseInput());

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
    const { provider, notifier, create } = setup();
    const pending = await createPendingCash(create, provider);

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
    const { provider, notifier, create } = setup();

    provider.result = {
      ...pendingResult(null, null),
      nextActionUrl: "https://3ds.conekta.com/session/1",
    };

    const payment = await create.execute(baseInput());

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
    const { notifier, create } = setup({ accountDeleted: true });

    await create.execute(baseInput());

    expect(notifier.calls).toHaveLength(0);
  });

  it("completes the payment when email delivery fails", async () => {
    const failing = new FakePaymentNotifier(new Error("Resend API error 500"));

    const { deliveryErrors, create } = setup({ notifier: failing });

    const payment = await create.execute(baseInput());

    expect(payment.status).toBe("completed");
    expect(deliveryErrors).toEqual([{ stage: "receipt", paymentId: payment.id }]);
  });
});
