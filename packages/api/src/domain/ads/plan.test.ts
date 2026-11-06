import type { Subscription } from "@aqui-suena/api/domain/billing/subscriptions";
import { describe, expect, it } from "vitest";
import { resolvePlan } from "./plan";

function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    accountId: "acc-1",
    planId: "commerce",
    status: "active",
    startedAt: new Date(Date.now() - 1000),
    endsAt: new Date(Date.now() + 1000 * 60 * 60),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("resolvePlan", () => {
  it("returns community when there is no subscription", () => {
    expect(resolvePlan(null)).toBe("community");
  });

  it("returns community when the subscription is not active", () => {
    const sub = makeSubscription({ status: "cancelled" });

    expect(resolvePlan(sub)).toBe("community");
  });

  it("returns community when the subscription has not started yet", () => {
    const sub = makeSubscription({ startedAt: new Date(Date.now() + 1000 * 60) });

    expect(resolvePlan(sub)).toBe("community");
  });

  it("returns community when the subscription has expired", () => {
    const sub = makeSubscription({ endsAt: new Date(Date.now() - 1000) });

    expect(resolvePlan(sub)).toBe("community");
  });

  it("returns the planId when the subscription is active", () => {
    const sub = makeSubscription({ planId: "trades" });

    expect(resolvePlan(sub)).toBe("trades");
  });
});
