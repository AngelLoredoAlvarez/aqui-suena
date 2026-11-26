import {
  InMemorySubscriptionRepository,
  type SubscriptionStatus,
} from "@aqui-suena/api/domain/billing/subscriptions/model/subscription";
import { FailRenewal } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/fail-renewal";
import { FakeSubscriptionNotifier } from "@aqui-suena/api/testing/notifiers";
import { describe, expect, it } from "vitest";

describe("FailRenewal", () => {
  it("marks the subscription as grace with a 7-day deadline", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const failRenewal = new FailRenewal({ subscriptions: subRepo });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    const failedAt = new Date("2026-02-01T00:00:00Z");

    await failRenewal.execute(sub.id, failedAt);

    const updated = await subRepo.getById(sub.id);
    expect(updated?.status).toBe("grace");
    expect(updated?.graceEnd?.toISOString()).toBe("2026-02-08T00:00:00.000Z");
  });

  it("throws when the subscription does not exist", async () => {
    const failRenewal = new FailRenewal({ subscriptions: new InMemorySubscriptionRepository() });

    await expect(failRenewal.execute("non-existent", new Date())).rejects.toThrow(
      "Subscription not found",
    );
  });
});

describe("FailRenewal atomicity", () => {
  class SpySubscriptionRepository extends InMemorySubscriptionRepository {
    readonly mutations: string[] = [];

    override async updateStatus(id: string, status: SubscriptionStatus): Promise<void> {
      this.mutations.push(`updateStatus:${status}`);
      await super.updateStatus(id, status);
    }

    override async enterGrace(id: string, graceEnd: Date): Promise<void> {
      this.mutations.push("enterGrace");
      await super.enterGrace(id, graceEnd);
    }
  }

  it("enters grace with a single atomic write", async () => {
    const subRepo = new SpySubscriptionRepository();
    const failRenewal = new FailRenewal({ subscriptions: subRepo });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z"),
    );

    await failRenewal.execute(sub.id, new Date("2026-02-01T00:00:00Z"));

    expect(subRepo.mutations).toEqual(["enterGrace"]);
  });
});

describe("FailRenewal notification", () => {
  function setup() {
    const subRepo = new InMemorySubscriptionRepository();
    const notifier = new FakeSubscriptionNotifier();
    const failRenewal = new FailRenewal({ subscriptions: subRepo, notifier });

    return { subRepo, notifier, failRenewal };
  }

  async function createActiveSubscription(repo: InMemorySubscriptionRepository) {
    return repo.create("acc-1", "trades", new Date("2026-01-01"), new Date("2026-02-01"));
  }

  it("notifies the owner when a recipient email is provided", async () => {
    const { subRepo, notifier, failRenewal } = setup();
    const sub = await createActiveSubscription(subRepo);

    await failRenewal.execute(sub.id, new Date("2026-02-01T00:00:00Z"), {
      recipientEmail: "owner@example.com",
    });

    expect(notifier.calls).toHaveLength(1);
    expect(notifier.calls[0]).toMatchObject({
      event: "renewal-failed",
      recipient: { email: "owner@example.com", locale: "es-MX" },
      data: { graceEnd: new Date("2026-02-08T00:00:00.000Z") },
    });
  });

  it("does not notify without a recipient email", async () => {
    const { subRepo, notifier, failRenewal } = setup();
    const sub = await createActiveSubscription(subRepo);

    await failRenewal.execute(sub.id, new Date("2026-02-01T00:00:00Z"));

    expect(notifier.calls).toHaveLength(0);
  });

  it("does not notify when no notifier is injected", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const failRenewal = new FailRenewal({ subscriptions: subRepo });
    const sub = await createActiveSubscription(subRepo);

    await expect(
      failRenewal.execute(sub.id, new Date("2026-02-01T00:00:00Z"), {
        recipientEmail: "owner@example.com",
      }),
    ).resolves.toBeUndefined();
  });
});
