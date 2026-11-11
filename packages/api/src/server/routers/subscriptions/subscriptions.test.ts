import type { Account } from "@aqui-suena/api/domain/accounts/account";
import { InMemoryAccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { ENTITLEMENTS } from "@aqui-suena/api/domain/plans/entitlements";
import type { Plan } from "@aqui-suena/api/domain/plans/plans";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { createSubscriptionsRouter } from "@aqui-suena/api/server/routers/subscriptions/subscriptions";
import { FakeSubscriptionNotifier } from "@aqui-suena/api/testing/notifiers";
import { describe, expect, it } from "vitest";

const tradesPlan: Plan = {
  id: "trades",
  name: "Oficios & Servicios",
  audience: "Servicios profesionales.",
  description: "Perfil profesional.",
  benefits: ["Hasta 30 servicios"],
  priceMonthly: 4900,
  priceAnnual: 49000,
  currency: "MXN",
  active: true,
  entitlements: ENTITLEMENTS.trades,
};

const account: Account = {
  id: "acc-1",
  email: "owner@example.com",
  planId: "trades",
  locale: "es-MX",
};

function setup() {
  const subRepo = new InMemorySubscriptionRepository([
    {
      id: "sub-1",
      accountId: "acc-1",
      planId: "trades",
      status: "active",
      startedAt: new Date("2025-01-01T00:00:00Z"),
      endsAt: null,
      graceEnd: null,
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2025-01-01T00:00:00Z"),
    },
  ]);

  const notifier = new FakeSubscriptionNotifier();

  const router = createSubscriptionsRouter({
    subscription: subRepo,
    plan: new InMemoryPlanRepository([tradesPlan]),
    account: new InMemoryAccountRepository([account]),
    notifier,
  });

  const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

  return { subRepo, notifier, caller };
}

describe("subscriptions.cancel", () => {
  it("cancels the active subscription and notifies the owner", async () => {
    const { subRepo, notifier, caller } = setup();

    await caller.cancel();

    expect((await subRepo.getById("sub-1"))?.status).toBe("cancelled");

    expect(notifier.calls).toHaveLength(1);
    expect(notifier.calls[0]).toMatchObject({
      event: "cancelled",
      recipient: { email: "owner@example.com", locale: "es-MX" },
    });
  });
});
