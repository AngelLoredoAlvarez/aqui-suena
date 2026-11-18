import {
  InMemorySubscriptionRepository,
  type SubscriptionStatus,
} from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { SubscriptionService } from "@aqui-suena/api/domain/billing/subscriptions/subscription-service";
import { plans } from "@aqui-suena/api/domain/billing/subscriptions/subscription-service.fixtures";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { FakeSubscriptionNotifier } from "@aqui-suena/api/testing/notifiers";
import { describe, expect, it } from "vitest";

describe("SubscriptionService.failRenewal", () => {
  it("marks the subscription as grace with a 7-day deadline", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    const failedAt = new Date("2026-02-01T00:00:00Z");

    await service.failRenewal(sub.id, failedAt);

    const updated = await subRepo.getById(sub.id);
    expect(updated?.status).toBe("grace");
    expect(updated?.graceEnd?.toISOString()).toBe("2026-02-08T00:00:00.000Z");
  });

  it("throws when the subscription does not exist", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    await expect(service.failRenewal("non-existent", new Date())).rejects.toThrow(
      "Subscription not found",
    );
  });
});

describe("SubscriptionService.failRenewal atomicity", () => {
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
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });

    const sub = await subRepo.create(
      "acc-1",
      "trades",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z"),
    );

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"));

    expect(subRepo.mutations).toEqual(["enterGrace"]);
  });
});

describe("SubscriptionService.failRenewal notification", () => {
  function setup() {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const notifier = new FakeSubscriptionNotifier();
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo, notifier });

    return { subRepo, notifier, service };
  }

  async function createActiveSubscription(repo: InMemorySubscriptionRepository) {
    return repo.create("acc-1", "trades", new Date("2026-01-01"), new Date("2026-02-01"));
  }

  it("notifies the owner when a recipient email is provided", async () => {
    const { subRepo, notifier, service } = setup();
    const sub = await createActiveSubscription(subRepo);

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"), {
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
    const { subRepo, notifier, service } = setup();
    const sub = await createActiveSubscription(subRepo);

    await service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"));

    expect(notifier.calls).toHaveLength(0);
  });

  it("does not notify when no notifier is injected", async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const planRepo = new InMemoryPlanRepository(plans);
    const service = new SubscriptionService({ subscriptionRepo: subRepo, planRepo });
    const sub = await createActiveSubscription(subRepo);

    await expect(
      service.failRenewal(sub.id, new Date("2026-02-01T00:00:00Z"), {
        recipientEmail: "owner@example.com",
      }),
    ).resolves.toBeUndefined();
  });
});
