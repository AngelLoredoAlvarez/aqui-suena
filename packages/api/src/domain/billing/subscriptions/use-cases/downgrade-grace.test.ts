import { plans } from "@aqui-suena/api/domain/billing/subscriptions/fixtures";
import { InMemorySubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/model/subscription";
import { DowngradeExpiredGrace } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/downgrade-grace";
import { FailRenewal } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/fail-renewal";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { FakeSubscriptionNotifier } from "@aqui-suena/api/testing/notifiers";
import { describe, expect, it } from "vitest";

function setup(notifier?: FakeSubscriptionNotifier) {
  const subRepo = new InMemorySubscriptionRepository();
  const planRepo = new InMemoryPlanRepository(plans);
  const failRenewal = new FailRenewal({ subscriptions: subRepo, notifier });
  const downgrade = new DowngradeExpiredGrace({
    subscriptions: subRepo,
    plans: planRepo,
    notifier,
  });

  return { subRepo, failRenewal, downgrade };
}

describe("DowngradeExpiredGrace", () => {
  it("does not downgrade while still in the grace window", async () => {
    const { subRepo, failRenewal, downgrade } = setup();

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await failRenewal.execute(sub.id, new Date("2026-02-01T00:00:00Z"));

    const result = await downgrade.execute(sub.id, "community", {
      now: new Date("2026-02-05T00:00:00Z"),
    });

    expect(result).toBeNull();
    expect((await subRepo.getById(sub.id))?.status).toBe("grace");
  });

  it("downgrades once the grace window has expired", async () => {
    const { subRepo, failRenewal, downgrade } = setup();

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await failRenewal.execute(sub.id, new Date("2026-02-01T00:00:00Z"));

    const result = await downgrade.execute(sub.id, "community", {
      now: new Date("2026-02-10T00:00:00Z"),
    });

    expect(result).not.toBeNull();
    expect(result?.planId).toBe("community");
    expect(result?.status).toBe("active");
    expect((await subRepo.getById(sub.id))?.status).toBe("cancelled");
  });

  it("clamps the new period at month-end after the grace window expires", async () => {
    const { subRepo, failRenewal, downgrade } = setup();

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-01-20T00:00:00Z"),
    );

    await failRenewal.execute(sub.id, new Date("2026-01-20T00:00:00Z"));

    const result = await downgrade.execute(sub.id, "community", {
      now: new Date("2026-01-31T12:00:00Z"),
    });

    expect(result?.endsAt?.toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  it("returns null for a non-grace subscription", async () => {
    const { subRepo, downgrade } = setup();

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    const result = await downgrade.execute(sub.id, "community", {
      now: new Date("2026-02-10T00:00:00Z"),
    });

    expect(result).toBeNull();
  });
});

describe("DowngradeExpiredGrace notification", () => {
  it("notifies the owner when the grace window expires", async () => {
    const notifier = new FakeSubscriptionNotifier();
    const { subRepo, failRenewal, downgrade } = setup(notifier);
    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await failRenewal.execute(sub.id, new Date("2026-02-01T00:00:00Z"), {
      recipientEmail: "owner@example.com",
    });

    await downgrade.execute(sub.id, "community", {
      now: new Date("2026-02-10T00:00:00Z"),
      recipientEmail: "owner@example.com",
    });

    expect(notifier.calls.map((call) => call.event)).toEqual(["renewal-failed", "grace-expired"]);
    expect(notifier.calls[1]).toMatchObject({
      event: "grace-expired",
      data: { planName: "Comunidad" },
    });
  });

  it("does not notify without a recipient email", async () => {
    const notifier = new FakeSubscriptionNotifier();
    const { subRepo, failRenewal, downgrade } = setup(notifier);
    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await failRenewal.execute(sub.id, new Date("2026-02-01T00:00:00Z"), {
      recipientEmail: "owner@example.com",
    });

    await downgrade.execute(sub.id, "community", {
      now: new Date("2026-02-10T00:00:00Z"),
    });

    expect(notifier.calls.map((call) => call.event)).toEqual(["renewal-failed"]);
  });
});
