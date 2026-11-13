import { D1SubscriptionRepository } from "@aqui-suena/api/infrastructure/billing/subscriptions/d1-subscription-repository";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "sub-1",
  account_id: "acc-1",
  plan_id: "trades",
  status: "active",
  started_at: 1700000000,
  ends_at: 1702678400,
  created_at: 1700000000,
  updated_at: 1700000000,
};

describe("D1SubscriptionRepository", () => {
  it("maps D1 rows into subscriptions (getActive)", async () => {
    const fake = new FakeD1Database(() => ({ first: sampleRow }));
    const repo = new D1SubscriptionRepository(fake.db);

    const sub = await repo.getActive("acc-1");

    expect(sub).not.toBeNull();
    expect(sub?.id).toBe("sub-1");
    expect(sub?.accountId).toBe("acc-1");
    expect(sub?.planId).toBe("trades");
    expect(sub?.status).toBe("active");
    expect(sub?.startedAt).toBeInstanceOf(Date);
    expect(sub?.endsAt).toBeInstanceOf(Date);
  });

  it("returns null when no active subscription (getActive)", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repo = new D1SubscriptionRepository(fake.db);

    expect(await repo.getActive("acc-999")).toBeNull();
  });

  it("maps D1 rows into subscriptions (getById)", async () => {
    const fake = new FakeD1Database(() => ({
      first: { ...sampleRow, plan_id: "commerce", status: "cancelled" },
    }));
    const repo = new D1SubscriptionRepository(fake.db);

    const sub = await repo.getById("sub-1");

    expect(sub).not.toBeNull();
    expect(sub?.status).toBe("cancelled");
    expect(sub?.planId).toBe("commerce");
  });

  it("throws DataIntegrityError when a stored status is unknown", async () => {
    const fake = new FakeD1Database(() => ({ first: { ...sampleRow, status: "paused" } }));
    const repo = new D1SubscriptionRepository(fake.db);

    await expect(repo.getById("sub-1")).rejects.toBeInstanceOf(DataIntegrityError);
  });

  it("throws DataIntegrityError when a stored plan id is unknown", async () => {
    const fake = new FakeD1Database(() => ({ first: { ...sampleRow, plan_id: "enterprise" } }));
    const repo = new D1SubscriptionRepository(fake.db);

    await expect(repo.getById("sub-1")).rejects.toBeInstanceOf(DataIntegrityError);
  });

  it("returns null for non-existent subscription (getById)", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repo = new D1SubscriptionRepository(fake.db);

    expect(await repo.getById("non-existent")).toBeNull();
  });

  it("maps D1 rows into subscriptions (listByAccount)", async () => {
    const fake = new FakeD1Database(() => ({
      all: [
        {
          ...sampleRow,
          id: "sub-1",
          plan_id: "community",
          status: "expired",
          started_at: 1690000000,
          ends_at: 1692678400,
          created_at: 1690000000,
          updated_at: 1692678400,
        },
        {
          ...sampleRow,
          id: "sub-2",
          plan_id: "trades",
          status: "active",
          started_at: 1692678400,
          ends_at: 1695356800,
          created_at: 1692678400,
          updated_at: 1692678400,
        },
      ],
    }));
    const repo = new D1SubscriptionRepository(fake.db);

    const list = await repo.listByAccount("acc-1");

    expect(list).toHaveLength(2);
    expect(list[0]?.status).toBe("expired");
    expect(list[1]?.status).toBe("active");
  });

  it("updates subscription status without throwing", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repo = new D1SubscriptionRepository(fake.db);

    await expect(repo.updateStatus("sub-1", "cancelled")).resolves.toBeUndefined();
  });

  it("updates subscription endsAt without throwing", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repo = new D1SubscriptionRepository(fake.db);

    await expect(repo.updateEndsAt("sub-1", new Date("2026-02-01"))).resolves.toBeUndefined();
  });

  it("issues UPDATE subscriptions SET ends_at with the right id", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repo = new D1SubscriptionRepository(fake.db);

    await repo.updateEndsAt("sub-1", new Date("2026-02-01"));

    expect(fake.statements[0]?.sql).toContain("UPDATE subscriptions SET ends_at");
    expect(fake.statements[0]?.sql).toContain("WHERE id = ?");
    expect(fake.statements[0]?.params).toContain("sub-1");
  });
});
