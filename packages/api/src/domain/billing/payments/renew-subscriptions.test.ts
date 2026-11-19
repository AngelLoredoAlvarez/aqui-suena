import type { Account } from "@aqui-suena/api/domain/accounts/account";
import { InMemoryAccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type { Payment } from "@aqui-suena/api/domain/billing/payments/payment";
import { InMemoryPaymentRepository } from "@aqui-suena/api/domain/billing/payments/payment";
import type { CreatePaymentInput } from "@aqui-suena/api/domain/billing/payments/payment-service";
import { RenewSubscriptions } from "@aqui-suena/api/domain/billing/payments/renew-subscriptions";
import { addInterval } from "@aqui-suena/api/domain/billing/subscriptions/period";
import type { Subscription } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import type {
  SubscriptionNotificationOptions,
  SubscriptionPlanChangeOptions,
} from "@aqui-suena/api/domain/billing/subscriptions/subscription-service";
import { plans } from "@aqui-suena/api/domain/billing/subscriptions/subscription-service.fixtures";
import type { Business } from "@aqui-suena/api/domain/directory/business";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-19T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_END = new Date("2026-12-19T12:00:00Z");

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    accountId: "acc-1",
    planId: "trades",
    billingInterval: "monthly",
    status: "active",
    startedAt: new Date("2026-11-01T00:00:00Z"),
    endsAt: new Date(NOW.getTime() + 2 * DAY_MS),
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

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-old",
    accountId: "acc-1",
    subscriptionId: "sub-1",
    planId: "trades",
    billingInterval: "monthly",
    method: "oxxo",
    provider: "conekta",
    providerOrderId: "ord-old",
    providerChargeId: null,
    idempotencyKey: "old",
    amount: 9900,
    currency: "MXN",
    status: "pending",
    reference: null,
    nextActionUrl: null,
    expiresAt: null,
    failureReason: null,
    periodStart: new Date(NOW.getTime() + 2 * DAY_MS),
    periodEnd: PERIOD_END,
    paidAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

class FakePaymentService {
  readonly inputs: CreatePaymentInput[] = [];
  error: Error | null = null;

  async create(input: CreatePaymentInput): Promise<Payment> {
    this.inputs.push(input);

    if (this.error !== null) throw this.error;

    return payment({
      id: `pay-${this.inputs.length}`,
      method: input.method,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      idempotencyKey: input.idempotencyKey,
    });
  }
}

class FakeSubscriptionService {
  readonly failCalls: Array<{
    id: string;
    at: Date;
    options?: SubscriptionNotificationOptions;
  }> = [];
  readonly downgradeCalls: Array<{
    id: string;
    planId: PlanId;
    options?: SubscriptionPlanChangeOptions;
  }> = [];

  async failRenewal(
    id: string,
    at: Date,
    options?: SubscriptionNotificationOptions,
  ): Promise<void> {
    this.failCalls.push({ id, at, options });
  }

  async downgradeExpiredGrace(
    id: string,
    planId: PlanId,
    options?: SubscriptionPlanChangeOptions,
  ): Promise<Subscription | null> {
    this.downgradeCalls.push({ id, planId, options });

    return null;
  }
}

function setup(
  options: {
    current?: Subscription[];
    history?: Payment[];
    savedCard?: boolean;
    deleted?: boolean;
  } = {},
) {
  const subRepo = new InMemorySubscriptionRepository(options.current ?? []);
  const paymentRepo = new InMemoryPaymentRepository(options.history ?? []);
  const savedCard = options.savedCard
    ? {
        customerId: "cus-1",
        sourceId: "src-1",
        brand: "visa",
        last4: "4242",
        expMonth: 12,
        expYear: 30,
      }
    : undefined;
  const accounts = new InMemoryAccountRepository([
    account({
      ...(savedCard === undefined ? {} : { savedCard }),
      ...(options.deleted ? { deletedAt: NOW } : {}),
    }),
  ]);
  const planRepo = new InMemoryPlanRepository(plans);
  const paymentService = new FakePaymentService();
  const service = new FakeSubscriptionService();
  const businesses = {
    async listAllByAccount(): Promise<Business[]> {
      return [{ id: "b1" }, { id: "b2" }] as unknown as Business[];
    },
  };
  const renew = new RenewSubscriptions({
    subscriptions: subRepo,
    payments: paymentRepo,
    paymentService,
    accounts,
    plans: planRepo,
    businesses,
    service,
    limit: 5,
    now: () => NOW,
  });

  return { subRepo, paymentRepo, paymentService, service, renew };
}

describe("RenewSubscriptions", () => {
  it("charges a saved card inside the card lead window", async () => {
    const { paymentService, renew } = setup({ current: [subscription()], savedCard: true });

    expect(await renew.execute()).toBe(1);
    expect(paymentService.inputs[0]).toMatchObject({
      accountId: "acc-1",
      planId: "trades",
      billingInterval: "monthly",
      method: "card",
      periodStart: new Date(NOW.getTime() + 2 * DAY_MS),
      periodEnd: addInterval(new Date(NOW.getTime() + 2 * DAY_MS), "monthly"),
      savedCard: { customerId: "cus-1", sourceId: "src-1" },
    });
    expect(paymentService.inputs[0]?.expiresAt).toBeUndefined();
    expect(paymentService.inputs[0]?.idempotencyKey).toBe(
      `sub:sub-1:${new Date(NOW.getTime() + 2 * DAY_MS).toISOString()}:1`,
    );
  });

  it("uses the last method when there is no saved card", async () => {
    const endsAt = new Date(NOW.getTime() + 6 * DAY_MS);
    const { paymentService, renew } = setup({
      current: [subscription({ endsAt })],
      history: [payment({ status: "completed", method: "spei", periodStart: PERIOD_END })],
    });

    expect(await renew.execute()).toBe(1);
    expect(paymentService.inputs[0]).toMatchObject({
      method: "spei",
      periodStart: endsAt,
      expiresAt: new Date(endsAt.getTime() + 7 * DAY_MS),
    });
    expect(paymentService.inputs[0]).not.toHaveProperty("savedCard");
  });

  it("does not charge a card before its three-day window", async () => {
    const { paymentService, renew } = setup({
      current: [subscription({ endsAt: new Date(NOW.getTime() + 4 * DAY_MS) })],
      savedCard: true,
    });

    expect(await renew.execute()).toBe(0);
    expect(paymentService.inputs).toHaveLength(0);
  });

  it("does not create a second charge while one is pending", async () => {
    const endsAt = new Date(NOW.getTime() + 2 * DAY_MS);
    const { paymentService, renew } = setup({
      current: [subscription({ endsAt })],
      history: [payment({ status: "pending", periodStart: endsAt })],
      savedCard: true,
    });

    expect(await renew.execute()).toBe(0);
    expect(paymentService.inputs).toHaveLength(0);
  });

  it("stops after three failed card attempts in the same period", async () => {
    const endsAt = new Date(NOW.getTime() + 2 * DAY_MS);
    const { paymentService, renew } = setup({
      current: [subscription({ endsAt })],
      history: [
        payment({ id: "p1", status: "failed", method: "card", periodStart: endsAt }),
        payment({ id: "p2", status: "failed", method: "card", periodStart: endsAt }),
        payment({ id: "p3", status: "failed", method: "card", periodStart: endsAt }),
      ],
      savedCard: true,
    });

    expect(await renew.execute()).toBe(0);
    expect(paymentService.inputs).toHaveLength(0);
  });

  it("uses the next attempt key after a failed card charge", async () => {
    const endsAt = new Date(NOW.getTime() + 2 * DAY_MS);
    const { paymentService, renew } = setup({
      current: [subscription({ endsAt })],
      history: [payment({ status: "failed", method: "card", periodStart: endsAt })],
      savedCard: true,
    });

    expect(await renew.execute()).toBe(1);
    expect(paymentService.inputs[0]?.idempotencyKey).toBe(`sub:sub-1:${endsAt.toISOString()}:2`);
  });

  it("enters grace when the paid period is over without a completed payment", async () => {
    const { paymentService, service, renew } = setup({
      current: [
        subscription({
          endsAt: new Date(NOW.getTime() - 60_000),
        }),
      ],
    });

    expect(await renew.execute()).toBe(0);
    expect(paymentService.inputs).toHaveLength(0);
    expect(service.failCalls).toEqual([
      {
        id: "sub-1",
        at: NOW,
        options: { recipientEmail: "ana@example.com", locale: "es-MX" },
      },
    ]);
  });

  it("downgrades an expired grace and keeps one business", async () => {
    const { service, renew } = setup({
      current: [
        subscription({
          status: "grace",
          endsAt: new Date(NOW.getTime() - 8 * DAY_MS),
          graceEnd: new Date(NOW.getTime() - 60_000),
        }),
      ],
    });

    expect(await renew.execute()).toBe(0);
    expect(service.downgradeCalls).toEqual([
      {
        id: "sub-1",
        planId: "community",
        options: {
          now: NOW,
          recipientEmail: "ana@example.com",
          locale: "es-MX",
          visibleBusinessIds: ["b1"],
        },
      },
    ]);
  });

  it("skips a deleted account", async () => {
    const { paymentService, service, renew } = setup({
      current: [subscription()],
      savedCard: true,
      deleted: true,
    });

    expect(await renew.execute()).toBe(0);
    expect(paymentService.inputs).toHaveLength(0);
    expect(service.failCalls).toHaveLength(0);
  });
});
