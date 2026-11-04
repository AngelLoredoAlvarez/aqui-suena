import { D1SubscriptionRepository } from "@aqui-suena/api/infrastructure/billing/d1-subscription-repository";
import { describe, expect, it } from "vitest";

function makeCapturingDb() {
  const state = { sql: "", params: [] as unknown[] };

  const db = {
    prepare: (sql: string) => {
      state.sql = sql;
      return {
        bind: (...params: unknown[]) => {
          state.params = params;
          return {
            first: async () => null,
            all: async () => ({ results: [] }),
            run: async () => ({ success: true }),
          };
        },
      };
    },
  } as unknown as D1Database;

  return { db, state };
}

describe("D1SubscriptionRepository", () => {
  it("maps D1 rows into subscriptions (getActive)", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            id: "sub-1",
            account_id: "acc-1",
            plan_id: "trades",
            status: "active",
            started_at: 1700000000,
            ends_at: 1702678400,
            created_at: 1700000000,
            updated_at: 1700000000,
          }),
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1SubscriptionRepository(fakeDb);

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
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1SubscriptionRepository(fakeDb);

    const sub = await repo.getActive("acc-999");

    expect(sub).toBeNull();
  });

  it("maps D1 rows into subscriptions (getById)", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            id: "sub-1",
            account_id: "acc-1",
            plan_id: "commerce",
            status: "cancelled",
            started_at: 1700000000,
            ends_at: 1702678400,
            created_at: 1700000000,
            updated_at: 1700000000,
          }),
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1SubscriptionRepository(fakeDb);

    const sub = await repo.getById("sub-1");

    expect(sub).not.toBeNull();
    expect(sub?.status).toBe("cancelled");
    expect(sub?.planId).toBe("commerce");
  });

  it("returns null for non-existent subscription (getById)", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1SubscriptionRepository(fakeDb);

    const sub = await repo.getById("non-existent");

    expect(sub).toBeNull();
  });

  it("maps D1 rows into subscriptions (listByAccount)", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({
            results: [
              {
                id: "sub-1",
                account_id: "acc-1",
                plan_id: "community",
                status: "expired",
                started_at: 1690000000,
                ends_at: 1692678400,
                created_at: 1690000000,
                updated_at: 1692678400,
              },
              {
                id: "sub-2",
                account_id: "acc-1",
                plan_id: "trades",
                status: "active",
                started_at: 1692678400,
                ends_at: 1695356800,
                created_at: 1692678400,
                updated_at: 1692678400,
              },
            ],
          }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1SubscriptionRepository(fakeDb);

    const list = await repo.listByAccount("acc-1");

    expect(list).toHaveLength(2);
    expect(list[0]?.status).toBe("expired");
    expect(list[1]?.status).toBe("active");
  });

  it("updates subscription status without throwing", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1SubscriptionRepository(fakeDb);

    await expect(repo.updateStatus("sub-1", "cancelled")).resolves.toBeUndefined();
  });

  it("updates subscription endsAt without throwing", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1SubscriptionRepository(fakeDb);

    await expect(repo.updateEndsAt("sub-1", new Date("2026-02-01"))).resolves.toBeUndefined();
  });

  it("issues UPDATE subscriptions SET ends_at with the right id", async () => {
    const { db, state } = makeCapturingDb();
    const repo = new D1SubscriptionRepository(db);

    await repo.updateEndsAt("sub-1", new Date("2026-02-01"));

    expect(state.sql).toContain("UPDATE subscriptions SET ends_at");
    expect(state.sql).toContain("WHERE id = ?");
    expect(state.params).toContain("sub-1");
  });
});
