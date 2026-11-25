import { RenewSubscription } from "@aqui-suena/api/domain/billing/subscriptions/renew";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { ConflictError, NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

function setup() {
  const subRepo = new InMemorySubscriptionRepository();
  const renew = new RenewSubscription({ subscriptions: subRepo });

  return { subRepo, renew };
}

describe("RenewSubscription", () => {
  it("extends an active subscription to the paid end", async () => {
    const { subRepo, renew } = setup();

    const current = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-11-01T00:00:00Z"),
      new Date("2026-12-01T00:00:00Z"),
    );

    const renewed = await renew.execute(current.id, new Date("2027-01-01T00:00:00Z"), "monthly");

    expect(renewed.id).toBe(current.id);
    expect(renewed.status).toBe("active");
    expect(renewed.endsAt?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("keeps the later end when the paid end does not advance", async () => {
    const { subRepo, renew } = setup();

    const current = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-11-01T00:00:00Z"),
      new Date("2026-12-15T00:00:00Z"),
    );

    const renewed = await renew.execute(current.id, new Date("2026-12-01T00:00:00Z"), "monthly");

    expect(renewed.endsAt?.toISOString()).toBe("2026-12-15T00:00:00.000Z");
  });

  it("reactivates a cancelled subscription and clears grace", async () => {
    const { subRepo, renew } = setup();

    const current = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-11-01T00:00:00Z"),
      new Date("2026-12-01T00:00:00Z"),
    );

    await subRepo.updateStatus(current.id, "cancelled");
    await subRepo.enterGrace(current.id, new Date("2026-12-08T00:00:00Z"));

    const renewed = await renew.execute(current.id, new Date("2027-01-01T00:00:00Z"), "monthly");

    expect(renewed.status).toBe("active");
    expect(renewed.graceEnd).toBeNull();
    expect(renewed.endsAt?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("updates the billing interval", async () => {
    const { subRepo, renew } = setup();

    const current = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-11-01T00:00:00Z"),
      new Date("2026-12-01T00:00:00Z"),
    );

    const renewed = await renew.execute(current.id, new Date("2027-11-01T00:00:00Z"), "annual");

    expect(renewed.billingInterval).toBe("annual");
  });

  it("rejects an expired subscription", async () => {
    const { subRepo, renew } = setup();

    const current = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-11-01T00:00:00Z"),
      new Date("2026-12-01T00:00:00Z"),
    );

    await subRepo.updateStatus(current.id, "expired");

    await expect(
      renew.execute(current.id, new Date("2027-01-01T00:00:00Z"), "monthly"),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws when the subscription does not exist", async () => {
    const { renew } = setup();

    await expect(
      renew.execute("missing", new Date("2027-01-01T00:00:00Z"), "monthly"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
