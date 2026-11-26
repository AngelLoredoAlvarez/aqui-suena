import { plans as planFixtures } from "@aqui-suena/api/domain/billing/subscriptions/fixtures";
import { InMemoryAccountRepository } from "@aqui-suena/api/infrastructure/memory/accounts/in-memory-account-repository";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/infrastructure/memory/billing/in-memory-subscription-repository";
import { InMemoryPlanRepository } from "@aqui-suena/api/infrastructure/memory/plans/in-memory-plan-repository";
import {
  createPaymentGraph,
  type PaymentGraphDeps,
} from "@aqui-suena/api/server/composition/payments";
import { FakePaymentNotifier } from "@aqui-suena/api/testing/notifiers";
import { describe, expect, it } from "vitest";

const db = {} as D1Database;

function deps(overrides: Partial<PaymentGraphDeps> = {}): PaymentGraphDeps {
  return {
    db,
    plans: new InMemoryPlanRepository(planFixtures),
    subscriptions: new InMemorySubscriptionRepository([]),
    accounts: new InMemoryAccountRepository([]),
    notifier: new FakePaymentNotifier(),
    onDeliveryError: () => {},
    ...overrides,
  };
}

describe("createPaymentGraph", () => {
  it("omits the provider and create-payment chain without Conekta", () => {
    const graph = createPaymentGraph(deps());

    expect(graph.conekta).toBeUndefined();
    expect(graph.createPayment).toBeUndefined();
  });

  it("builds the provider and create-payment chain when Conekta is configured", () => {
    const graph = createPaymentGraph(deps({ conekta: { apiKey: "key" } }));

    expect(graph.conekta).toBeDefined();
    expect(graph.createPayment).toBeDefined();
  });

  it("always wires the payment repository and state machine", () => {
    const graph = createPaymentGraph(deps());

    expect(graph.payments).toBeDefined();
    expect(graph.completePayment).toBeDefined();
    expect(graph.failPayment).toBeDefined();
    expect(graph.expirePayment).toBeDefined();
    expect(graph.subscriptionWriter).toBeDefined();
    expect(graph.notifications).toBeDefined();
  });
});
