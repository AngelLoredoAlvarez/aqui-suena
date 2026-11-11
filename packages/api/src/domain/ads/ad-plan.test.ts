import type { Subscription } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { describe, expect, it } from "vitest";
import { resolvePlan } from "./ad-plan";

function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    accountId: "acc-1",
    planId: "commerce",
    status: "active",
    startedAt: new Date(Date.now() - 1000),
    endsAt: new Date(Date.now() + 1000 * 60 * 60),
    graceEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Subscription;
}

describe("resolvePlan", () => {
  it("returns community when there is no subscription", () => {
    expect(resolvePlan(null)).toBe("community");
  });

  it("keeps the paid plan when a cancelled subscription still has paid time left", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const sub = makeSubscription({
      status: "cancelled",
      startedAt: new Date("2026-06-01T00:00:00Z"),
      endsAt: new Date("2026-07-01T00:00:00Z"),
    });

    expect(resolvePlan(sub, now)).toBe("commerce");
  });

  it("returns community when a cancelled subscription passed its paid period", () => {
    const now = new Date("2026-07-02T00:00:00Z");
    const sub = makeSubscription({
      status: "cancelled",
      startedAt: new Date("2026-06-01T00:00:00Z"),
      endsAt: new Date("2026-07-01T00:00:00Z"),
    });

    expect(resolvePlan(sub, now)).toBe("community");
  });

  it("keeps the paid plan during the failed-renewal grace window", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const sub = makeSubscription({
      status: "grace",
      startedAt: new Date("2026-06-01T00:00:00Z"),
      endsAt: new Date("2026-06-14T00:00:00Z"),
      graceEnd: new Date("2026-06-21T00:00:00Z"),
    });

    expect(resolvePlan(sub, now)).toBe("commerce");
  });

  it("returns community once the grace window closed", () => {
    const now = new Date("2026-06-22T00:00:00Z");
    const sub = makeSubscription({
      status: "grace",
      startedAt: new Date("2026-06-01T00:00:00Z"),
      endsAt: new Date("2026-06-14T00:00:00Z"),
      graceEnd: new Date("2026-06-21T00:00:00Z"),
    });

    expect(resolvePlan(sub, now)).toBe("community");
  });

  it("returns community for an expired subscription", () => {
    const now = new Date("2026-06-22T00:00:00Z");

    expect(resolvePlan(makeSubscription({ status: "expired" }), now)).toBe("community");
  });

  it("returns community at exactly endsAt for a cancelled subscription", () => {
    const endsAt = new Date("2026-07-01T00:00:00Z");
    const sub = makeSubscription({
      status: "cancelled",
      startedAt: new Date("2026-06-01T00:00:00Z"),
      endsAt,
    });

    expect(resolvePlan(sub, endsAt)).toBe("community");
  });

  it("returns the planId one millisecond before endsAt for a cancelled subscription", () => {
    const endsAt = new Date("2026-07-01T00:00:00Z");
    const sub = makeSubscription({
      status: "cancelled",
      startedAt: new Date("2026-06-01T00:00:00Z"),
      endsAt,
    });

    expect(resolvePlan(sub, new Date(endsAt.getTime() - 1))).toBe("commerce");
  });

  it("returns the planId at exactly graceEnd", () => {
    const graceEnd = new Date("2026-07-08T00:00:00Z");
    const sub = makeSubscription({
      status: "grace",
      startedAt: new Date("2026-06-01T00:00:00Z"),
      endsAt: new Date("2026-06-14T00:00:00Z"),
      graceEnd,
    });

    expect(resolvePlan(sub, graceEnd)).toBe("commerce");
  });

  it("returns community one millisecond after graceEnd", () => {
    const graceEnd = new Date("2026-07-08T00:00:00Z");
    const sub = makeSubscription({
      status: "grace",
      startedAt: new Date("2026-06-01T00:00:00Z"),
      endsAt: new Date("2026-06-14T00:00:00Z"),
      graceEnd,
    });

    expect(resolvePlan(sub, new Date(graceEnd.getTime() + 1))).toBe("community");
  });

  it("fails closed when a cancelled subscription has no endsAt", () => {
    expect(resolvePlan(makeSubscription({ status: "cancelled", endsAt: null }))).toBe("community");
  });

  it("fails closed when a grace subscription has no graceEnd", () => {
    expect(resolvePlan(makeSubscription({ status: "grace", graceEnd: null }))).toBe("community");
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
