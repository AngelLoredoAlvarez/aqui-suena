import { SubscriptionPaymentWriter } from "@aqui-suena/api/domain/billing/subscriptions/ports/subscription-payment-writer";
import { RenewSubscription } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/renew";
import { SubscribeToPlan } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/subscribe";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-subscription-repository";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-19T12:00:00Z");
const ANNUAL_END = new Date("2027-11-19T12:00:00Z");
const MONTHLY_END = new Date("2026-12-19T12:00:00Z");

function setup() {
  const subRepo = new InMemorySubscriptionRepository();
  const writer = new SubscriptionPaymentWriter({
    subscriptions: subRepo,
    subscribe: new SubscribeToPlan({ subscriptions: subRepo }),
    renew: new RenewSubscription({ subscriptions: subRepo }),
    now: () => NOW,
  });

  return { subRepo, writer };
}

function activateInput(
  overrides: Partial<Parameters<SubscriptionPaymentWriter["activate"]>[0]> = {},
) {
  return {
    paymentId: "pay-1",
    accountId: "acc-1",
    planId: "trades" as const,
    billingInterval: "annual" as const,
    periodStart: NOW,
    periodEnd: ANNUAL_END,
    ...overrides,
  };
}

describe("SubscriptionPaymentWriter", () => {
  it("creates a subscription for a new account", async () => {
    const { subRepo, writer } = setup();

    const id = await writer.activate(activateInput());

    const sub = await subRepo.getById(id);

    expect(sub).toMatchObject({
      id,
      accountId: "acc-1",
      planId: "trades",
      billingInterval: "annual",
      status: "active",
      startedAt: NOW,
    });
    expect(sub?.endsAt?.toISOString()).toBe(ANNUAL_END.toISOString());
  });

  it("renews the active subscription when the plan does not change", async () => {
    const { subRepo, writer } = setup();

    const current = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-11-01T00:00:00Z"),
      new Date("2026-12-01T00:00:00Z"),
    );

    const id = await writer.activate(
      activateInput({ billingInterval: "monthly", periodEnd: MONTHLY_END }),
    );

    const sub = await subRepo.getById(id);

    expect(id).toBe(current.id);
    expect(sub?.status).toBe("active");
    expect(sub?.endsAt?.toISOString()).toBe(MONTHLY_END.toISOString());
  });

  it("reactivates a cancelled subscription with paid time left", async () => {
    const { subRepo, writer } = setup();

    const current = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-11-01T00:00:00Z"),
      new Date("2026-12-01T00:00:00Z"),
    );

    await subRepo.updateStatus(current.id, "cancelled");

    const id = await writer.activate(
      activateInput({ billingInterval: "monthly", periodEnd: MONTHLY_END }),
    );

    const sub = await subRepo.getById(id);

    expect(id).toBe(current.id);
    expect(sub?.status).toBe("active");
    expect(sub?.endsAt?.toISOString()).toBe(MONTHLY_END.toISOString());
  });

  it("switches plans by cancelling the old active subscription", async () => {
    const { subRepo, writer } = setup();

    const current = await subRepo.create(
      "acc-1",
      "commerce",
      new Date("2026-11-01T00:00:00Z"),
      new Date("2027-01-01T00:00:00Z"),
    );

    const id = await writer.activate(activateInput());
    const created = await subRepo.getById(id);
    const previous = await subRepo.getById(current.id);

    expect(id).not.toBe(current.id);
    expect(created?.planId).toBe("trades");
    expect(created?.status).toBe("active");
    expect(previous?.status).toBe("cancelled");
  });

  it("is idempotent for the same paid period", async () => {
    const { subRepo, writer } = setup();

    const first = await writer.activate(activateInput());

    const second = await writer.activate(activateInput());

    expect(second).toBe(first);
    expect(await subRepo.listByAccount("acc-1")).toHaveLength(1);
    expect((await subRepo.getById(first))?.endsAt?.toISOString()).toBe(ANNUAL_END.toISOString());
  });

  it("clears grace when the payment lands during the grace period", async () => {
    const { subRepo, writer } = setup();

    const current = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-11-01T00:00:00Z"),
      new Date("2026-11-26T00:00:00Z"),
    );

    await subRepo.enterGrace(current.id, new Date("2026-11-26T00:00:00Z"));

    const id = await writer.activate(
      activateInput({ billingInterval: "monthly", periodEnd: MONTHLY_END }),
    );

    const sub = await subRepo.getById(id);

    expect(sub?.status).toBe("active");
    expect(sub?.graceEnd).toBeNull();
  });
});
