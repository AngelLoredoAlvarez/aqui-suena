import {
  InMemorySubscriptionRepository,
  parseSubscriptionStatus,
} from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

describe("parseSubscriptionStatus", () => {
  it.each(["active", "cancelled", "expired", "grace"])("accepts the valid status %s", (status) => {
    expect(parseSubscriptionStatus(status)).toBe(status);
  });

  it.each(["paused", "", "ACTIVE"])("rejects the unknown status %s", (value) => {
    expect(() => parseSubscriptionStatus(value)).toThrow(DataIntegrityError);
  });

  it.each([null, 1, {}])("rejects the non-string value %s", (value) => {
    expect(() => parseSubscriptionStatus(value)).toThrow(DataIntegrityError);
  });

  it("carries the field and the offending value", () => {
    let thrown: unknown;
    try {
      parseSubscriptionStatus("paused");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(DataIntegrityError);
    expect(thrown).toMatchObject({ field: "status", value: "paused" });
  });
});

describe("InMemorySubscriptionRepository", () => {
  it("creates a subscription with active status", async () => {
    const repo = new InMemorySubscriptionRepository();

    const sub = await repo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    expect(sub.accountId).toBe("acc-1");
    expect(sub.planId).toBe("community");
    expect(sub.status).toBe("active");
    expect(sub.id).toBeTruthy();
  });

  it("returns active subscription for an account", async () => {
    const repo = new InMemorySubscriptionRepository();

    const startedAt = new Date("2026-01-01");
    const endsAt = new Date("2026-02-01");

    await repo.create("acc-1", "community", startedAt, endsAt);

    const duringPeriod = new Date("2026-01-15");
    const active = await repo.getActive("acc-1", duringPeriod);

    expect(active).not.toBeNull();
    expect(active?.planId).toBe("community");
  });

  it("returns null when no active subscription exists", async () => {
    const repo = new InMemorySubscriptionRepository();

    const active = await repo.getActive("acc-999");

    expect(active).toBeNull();
  });

  it("updates subscription status", async () => {
    const repo = new InMemorySubscriptionRepository();

    const sub = await repo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await repo.updateStatus(sub.id, "cancelled");

    const updated = await repo.getById(sub.id);

    expect(updated?.status).toBe("cancelled");
  });

  it("lists all subscriptions for an account", async () => {
    const repo = new InMemorySubscriptionRepository();

    await repo.create("acc-1", "community", new Date("2026-01-01"), new Date("2026-02-01"));

    await repo.create("acc-1", "trades", new Date("2026-02-01"), new Date("2026-03-01"));

    const list = await repo.listByAccount("acc-1");

    expect(list).toHaveLength(2);
  });

  it("does not return cancelled subscription as active", async () => {
    const repo = new InMemorySubscriptionRepository();

    const sub = await repo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await repo.updateStatus(sub.id, "cancelled");

    const active = await repo.getActive("acc-1");

    expect(active).toBeNull();
  });

  it("does not return an active subscription whose period already ended", async () => {
    const repo = new InMemorySubscriptionRepository();

    const startedAt = new Date("2026-01-01");
    const endsAt = new Date("2026-02-01");

    await repo.create("acc-1", "community", startedAt, endsAt);

    const afterEnd = new Date("2026-03-01");
    const active = await repo.getActive("acc-1", afterEnd);

    expect(active).toBeNull();
  });

  it("treats a grace subscription as active while within its grace window", async () => {
    const repo = new InMemorySubscriptionRepository();

    const sub = await repo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await repo.updateStatus(sub.id, "grace");

    await repo.updateGraceEnd(sub.id, new Date("2026-02-08"));

    const active = await repo.getActive("acc-1", new Date("2026-02-05"));

    expect(active?.id).toBe(sub.id);
    expect(active?.status).toBe("grace");
    expect(active?.graceEnd?.toISOString()).toBe("2026-02-08T00:00:00.000Z");
  });

  it("does not return a grace subscription once the grace window has passed", async () => {
    const repo = new InMemorySubscriptionRepository();

    const sub = await repo.create(
      "acc-1",
      "community",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    await repo.updateStatus(sub.id, "grace");

    await repo.updateGraceEnd(sub.id, new Date("2026-02-08"));

    const active = await repo.getActive("acc-1", new Date("2026-02-09"));

    expect(active).toBeNull();
  });
});
