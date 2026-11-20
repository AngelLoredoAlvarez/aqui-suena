import type { Account } from "@aqui-suena/api/domain/accounts/account";
import { InMemoryAccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import {
  type CheckoutInput,
  CheckoutService,
} from "@aqui-suena/api/domain/billing/payments/checkout-service";
import type { Payment } from "@aqui-suena/api/domain/billing/payments/payment";
import type { CreatePaymentInput } from "@aqui-suena/api/domain/billing/payments/payment-service";
import { addInterval } from "@aqui-suena/api/domain/billing/subscriptions/period";
import type { Subscription } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { plans } from "@aqui-suena/api/domain/billing/subscriptions/subscription-service.fixtures";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { ConflictError, NotFoundError, ValidationError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-19T12:00:00Z");
const CUSTOMER = { name: "Ana", email: "ana@example.com", phone: "+5215555555555" };

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    accountId: "acc-1",
    planId: "trades",
    billingInterval: "monthly",
    status: "active",
    startedAt: new Date("2026-11-01T00:00:00Z"),
    endsAt: new Date("2026-12-01T00:00:00Z"),
    graceEnd: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc-1",
    email: "ana@example.com",
    planId: "trades",
    locale: "es-MX",
    ...overrides,
  };
}

function buildPayment(input: CreatePaymentInput): Payment {
  return {
    id: "pay-1",
    accountId: input.accountId,
    subscriptionId: null,
    planId: input.planId,
    billingInterval: input.billingInterval,
    method: input.method,
    provider: "conekta",
    providerOrderId: null,
    providerChargeId: null,
    idempotencyKey: input.idempotencyKey,
    amount: 9900,
    currency: "MXN",
    status: "pending",
    reference: null,
    nextActionUrl: null,
    expiresAt: null,
    failureReason: null,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    paidAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

class FakePayments {
  readonly inputs: CreatePaymentInput[] = [];
  pendingForOtherPlan = false;

  async create(input: CreatePaymentInput): Promise<Payment> {
    this.inputs.push(input);

    return buildPayment(input);
  }

  async hasPendingForOtherPlan(): Promise<boolean> {
    return this.pendingForOtherPlan;
  }
}

function baseInput(overrides: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    accountId: "acc-1",
    planId: "trades",
    billingInterval: "monthly",
    method: "card",
    idempotencyKey: "idem-1",
    cardToken: "tok-1",
    customer: CUSTOMER,
    ...overrides,
  };
}

function setup(options: { current?: Subscription[]; currentAccount?: Account } = {}) {
  const payments = new FakePayments();
  const subscriptions = new InMemorySubscriptionRepository(options.current ?? []);
  const planRepo = new InMemoryPlanRepository(plans);
  const accounts = new InMemoryAccountRepository([options.currentAccount ?? account()]);
  const service = new CheckoutService({
    payments,
    subscriptions,
    plans: planRepo,
    accounts,
    returnUrl: "https://app.example/checkout/return",
    now: () => NOW,
  });

  return { payments, service };
}

describe("CheckoutService", () => {
  it("rejects a new plan while another plan is pending", async () => {
    const { payments, service } = setup();

    payments.pendingForOtherPlan = true;

    await expect(service.execute(baseInput({ planId: "commerce" }))).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(payments.inputs).toHaveLength(0);
  });

  it("starts a new period at now for a new account", async () => {
    const { payments, service } = setup();

    await service.execute(baseInput());

    expect(payments.inputs[0]).toMatchObject({
      accountId: "acc-1",
      planId: "trades",
      billingInterval: "monthly",
      method: "card",
      idempotencyKey: "idem-1",
      periodStart: NOW,
      periodEnd: addInterval(NOW, "monthly"),
      cardToken: "tok-1",
      savedCard: undefined,
      returnUrl: "https://app.example/checkout/return",
      expiresAt: undefined,
    });
  });

  it("renews the same plan from the paid end", async () => {
    const { payments, service } = setup({ current: [subscription()] });

    await service.execute(baseInput());

    expect(payments.inputs[0]).toMatchObject({
      periodStart: new Date("2026-12-01T00:00:00Z"),
      periodEnd: new Date("2027-01-01T00:00:00Z"),
    });
  });

  it("keeps the annual interval when renewing", async () => {
    const { payments, service } = setup({
      current: [
        subscription({
          billingInterval: "annual",
          endsAt: new Date("2027-01-01T00:00:00Z"),
        }),
      ],
    });

    await service.execute(baseInput({ billingInterval: "annual" }));

    expect(payments.inputs[0]).toMatchObject({
      billingInterval: "annual",
      periodStart: new Date("2027-01-01T00:00:00Z"),
      periodEnd: new Date("2028-01-01T00:00:00Z"),
    });
  });

  it("chains an upgrade from the paid end", async () => {
    const { payments, service } = setup({
      current: [
        subscription({
          planId: "community",
          endsAt: new Date("2026-12-01T00:00:00Z"),
        }),
      ],
    });

    await service.execute(baseInput());

    expect(payments.inputs[0]).toMatchObject({
      periodStart: NOW,
      periodEnd: new Date("2027-01-01T00:00:00Z"),
    });
  });

  it("rejects a downgrade with paid time left", async () => {
    const { service } = setup({
      current: [
        subscription({
          planId: "commerce",
          endsAt: new Date("2026-12-01T00:00:00Z"),
        }),
      ],
    });

    await expect(service.execute(baseInput())).rejects.toBeInstanceOf(ConflictError);
  });

  it("starts a grace renewal at now", async () => {
    const { payments, service } = setup({
      current: [
        subscription({
          status: "grace",
          endsAt: new Date("2026-11-01T00:00:00Z"),
          graceEnd: new Date("2026-11-26T00:00:00Z"),
        }),
      ],
    });

    await service.execute(baseInput());

    expect(payments.inputs[0]).toMatchObject({
      periodStart: NOW,
      periodEnd: addInterval(NOW, "monthly"),
    });
  });

  it("sets a seven-day reference expiry for cash and SPEI", async () => {
    const { payments, service } = setup();
    const expiresAt = new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000);

    await service.execute(baseInput({ method: "cash", cardToken: undefined }));
    await service.execute(
      baseInput({ method: "spei", cardToken: undefined, idempotencyKey: "idem-2" }),
    );

    expect(payments.inputs[0]?.expiresAt).toEqual(expiresAt);
    expect(payments.inputs[1]?.expiresAt).toEqual(expiresAt);
  });

  it("uses the saved card when no token is provided", async () => {
    const { payments, service } = setup({
      currentAccount: account({
        savedCard: {
          customerId: "cus-1",
          sourceId: "src-1",
          brand: "visa",
          last4: "4242",
          expMonth: 12,
          expYear: 30,
        },
      }),
    });

    await service.execute(baseInput({ cardToken: undefined }));

    expect(payments.inputs[0]).toMatchObject({
      savedCard: { customerId: "cus-1", sourceId: "src-1" },
    });
    expect(payments.inputs[0]?.cardToken).toBeUndefined();
  });

  it("requires a token when the account has no saved card", async () => {
    const { service } = setup();

    await expect(service.execute(baseInput({ cardToken: undefined }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects a free plan", async () => {
    const { service } = setup();

    await expect(service.execute(baseInput({ planId: "community" }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects an unknown plan", async () => {
    const { service } = setup();

    await expect(
      service.execute(baseInput({ planId: "unknown" as CreatePaymentInput["planId"] })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
