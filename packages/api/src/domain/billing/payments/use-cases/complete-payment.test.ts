import type { Payment } from "@aqui-suena/api/domain/billing/payments/model/payment";
import type { ChargeResult } from "@aqui-suena/api/domain/billing/payments/ports/payment-provider";
import { CompletePayment } from "@aqui-suena/api/domain/billing/payments/use-cases/complete-payment";
import {
  CreatePayment,
  type CreatePaymentInput,
} from "@aqui-suena/api/domain/billing/payments/use-cases/create-payment";
import { PaymentNotifications } from "@aqui-suena/api/domain/billing/payments/use-cases/payment-notifications";
import { plans as planFixtures } from "@aqui-suena/api/domain/billing/subscriptions/fixtures";
import { InMemoryAccountRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-account-repository";
import { InMemoryPaymentRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-payment-repository";
import { InMemoryPlanRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-plan-repository";
import { ConflictError } from "@aqui-suena/api/shared/domain-error";
import { FakePaymentNotifier } from "@aqui-suena/api/testing/notifiers";
import { FakePaymentProvider } from "@aqui-suena/api/testing/payment-provider";
import { FakePaymentSubscriptionWriter } from "@aqui-suena/api/testing/payment-subscription-writer";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-19T12:00:00Z");
const PERIOD_START = NOW;
const PERIOD_END = new Date("2026-12-19T12:00:00Z");
const CUSTOMER = { name: "Ana", email: "ana@example.com", phone: "+5215555555555" };

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

function setup() {
  const payments = new InMemoryPaymentRepository();
  const provider = new FakePaymentProvider();
  const writer = new FakePaymentSubscriptionWriter();
  const notifier = new FakePaymentNotifier();
  const accounts = new InMemoryAccountRepository([
    {
      id: "acc-1",
      email: "owner@example.com",
      planId: "trades",
      locale: "es-MX",
      deletedAt: null,
    },
  ]);
  const plans = new InMemoryPlanRepository(planFixtures);

  const notifications = new PaymentNotifications({
    payments,
    plans,
    accounts,
    notifier,
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

  return { payments, provider, writer, create, complete };
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

describe("CompletePayment", () => {
  it("activates the subscription and records it on the payment", async () => {
    const { provider, writer, create, complete } = setup();
    const pending = await createPendingCash(create, provider);

    const completed = await complete.execute(pending.id);

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
    const { writer, create, complete } = setup();
    const payment = await create.execute(baseInput());

    const completed = await complete.execute(payment.id);

    expect(completed.id).toBe(payment.id);
    expect(completed.status).toBe("completed");
    expect(writer.calls).toHaveLength(1);
  });

  it("activates the subscription once when two completions race", async () => {
    const { payments, provider, writer, create, complete } = setup();
    const pending = await createPendingCash(create, provider);

    await Promise.all([complete.execute(pending.id), complete.execute(pending.id)]);

    expect(writer.calls).toHaveLength(1);
    expect((await payments.getById(pending.id))?.subscriptionId).toBe("sub-1");
  });

  it("releases the claim when activation fails so a retry can complete", async () => {
    const { payments, provider, writer, create, complete } = setup();
    const pending = await createPendingCash(create, provider);

    writer.error = new Error("subscription store failed");

    await expect(complete.execute(pending.id)).rejects.toThrow("subscription store failed");

    const released = await payments.getById(pending.id);

    expect(released).toMatchObject({ status: "pending", paidAt: null });

    writer.error = null;

    const completed = await complete.execute(pending.id);

    expect(completed).toMatchObject({ status: "completed", subscriptionId: "sub-1" });
  });

  it("repairs a completed payment without a subscription after the delay", async () => {
    const { payments, provider, writer, create, complete } = setup();
    const pending = await createPendingCash(create, provider);

    await payments.claimCompletion(pending.id, NOW);

    const claimed = await payments.getById(pending.id);

    if (claimed === null) throw new Error("payment missing");

    claimed.updatedAt = new Date(NOW.getTime() - 6 * 60 * 1000);

    const completed = await complete.execute(pending.id);

    expect(writer.calls).toHaveLength(1);
    expect(completed).toMatchObject({ status: "completed", subscriptionId: "sub-1" });
  });

  it("rejects a non-pending payment", async () => {
    const { provider, create, complete } = setup();

    provider.result = {
      ...paidResult(),
      status: "declined",
      failureReason: "insufficient_funds",
    };

    const failed = await create.execute(baseInput());

    await expect(complete.execute(failed.id)).rejects.toBeInstanceOf(ConflictError);
  });
});
