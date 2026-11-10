import { D1PaymentRepository } from "@aqui-suena/api/infrastructure/billing/payments/d1-payment-repository";
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

describe("D1PaymentRepository", () => {
  it("maps D1 rows into payments (getById)", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            id: "pay-1",
            subscription_id: "sub-1",
            amount: 4900,
            currency: "MXN",
            status: "completed",
            paid_at: 1700000000,
            created_at: 1700000000,
            updated_at: 1700000000,
          }),
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1PaymentRepository(fakeDb);

    const payment = await repo.getById("pay-1");

    expect(payment).not.toBeNull();
    expect(payment?.id).toBe("pay-1");
    expect(payment?.subscriptionId).toBe("sub-1");
    expect(payment?.amount).toBe(4900);
    expect(payment?.status).toBe("completed");
    expect(payment?.paidAt).toBeInstanceOf(Date);
  });

  it("returns null for non-existent payment (getById)", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1PaymentRepository(fakeDb);

    const payment = await repo.getById("non-existent");

    expect(payment).toBeNull();
  });

  it("maps D1 rows into payments (listBySubscription)", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({
            results: [
              {
                id: "pay-1",
                subscription_id: "sub-1",
                amount: 4900,
                currency: "MXN",
                status: "completed",
                paid_at: 1700000000,
                created_at: 1700000000,
                updated_at: 1700000000,
              },
              {
                id: "pay-2",
                subscription_id: "sub-1",
                amount: 4900,
                currency: "MXN",
                status: "failed",
                paid_at: null,
                created_at: 1702678400,
                updated_at: 1702678400,
              },
            ],
          }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1PaymentRepository(fakeDb);

    const list = await repo.listBySubscription("sub-1");

    expect(list).toHaveLength(2);
    expect(list[0]?.status).toBe("completed");
    expect(list[1]?.status).toBe("failed");
    expect(list[1]?.paidAt).toBeNull();
  });

  it("creates a payment with pending status", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1PaymentRepository(fakeDb);

    const payment = await repo.create("sub-1", 4900, "MXN");

    expect(payment.subscriptionId).toBe("sub-1");
    expect(payment.amount).toBe(4900);
    expect(payment.currency).toBe("MXN");
    expect(payment.status).toBe("pending");
    expect(payment.paidAt).toBeNull();
    expect(payment.id).toBeTruthy();
    expect(payment.createdAt).toBeInstanceOf(Date);
    expect(payment.updatedAt).toBeInstanceOf(Date);
  });

  it("updates payment status without throwing", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1PaymentRepository(fakeDb);

    await expect(
      repo.updateStatus("pay-1", "completed", new Date("2026-01-15")),
    ).resolves.toBeUndefined();
  });

  it("updates payment status to failed without paidAt", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const repo = new D1PaymentRepository(fakeDb);

    await expect(repo.updateStatus("pay-1", "failed")).resolves.toBeUndefined();
  });

  it("issues UPDATE payments SET status with the right id and status", async () => {
    const { db, state } = makeCapturingDb();
    const repo = new D1PaymentRepository(db);

    await repo.updateStatus("pay-1", "completed", new Date("2026-01-15"));

    expect(state.sql).toContain("UPDATE payments SET status");
    expect(state.sql).toContain("WHERE id = ?");
    expect(state.params).toContain("pay-1");
    expect(state.params).toContain("completed");
  });
});
