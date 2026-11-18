import { D1PaymentRepository } from "@aqui-suena/api/infrastructure/billing/payments/d1-payment-repository";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { normalizeSql } from "@aqui-suena/api/testing/sql";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "pay-1",
  subscription_id: "sub-1",
  plan_id: "commerce",
  amount: 4900,
  currency: "MXN",
  status: "completed",
  paid_at: 1700000000,
  created_at: 1700000000,
  updated_at: 1700000000,
};

describe("D1PaymentRepository", () => {
  it("maps D1 rows into payments (getById)", async () => {
    const fake = new FakeD1Database(() => ({ first: sampleRow }));
    const repo = new D1PaymentRepository(fake.db);

    const payment = await repo.getById("pay-1");

    expect(payment).not.toBeNull();
    expect(payment?.id).toBe("pay-1");
    expect(payment?.subscriptionId).toBe("sub-1");
    expect(payment?.amount).toBe(4900);
    expect(payment?.status).toBe("completed");
    expect(payment?.paidAt).toBeInstanceOf(Date);
    expect(payment?.planId).toBe("commerce");
  });

  it("throws DataIntegrityError when a stored status is unknown", async () => {
    const fake = new FakeD1Database(() => ({
      first: { ...sampleRow, status: "unknown", paid_at: null },
    }));
    const repo = new D1PaymentRepository(fake.db);

    await expect(repo.getById("pay-1")).rejects.toBeInstanceOf(DataIntegrityError);
  });

  it("returns null for non-existent payment (getById)", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repo = new D1PaymentRepository(fake.db);

    expect(await repo.getById("non-existent")).toBeNull();
  });

  it("maps D1 rows into payments (listBySubscription)", async () => {
    const fake = new FakeD1Database(() => ({
      all: [
        sampleRow,
        {
          ...sampleRow,
          id: "pay-2",
          status: "failed",
          paid_at: null,
          created_at: 1702678400,
          updated_at: 1702678400,
        },
      ],
    }));
    const repo = new D1PaymentRepository(fake.db);

    const list = await repo.listBySubscription("sub-1");

    expect(list).toHaveLength(2);
    expect(list[0]?.status).toBe("completed");
    expect(list[1]?.status).toBe("failed");
    expect(list[1]?.paidAt).toBeNull();
  });

  it("creates a pending payment with its plan snapshot", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repo = new D1PaymentRepository(fake.db);

    const payment = await repo.create({
      subscriptionId: "sub-1",
      planId: "commerce",
      amount: 9900,
      currency: "MXN",
    });

    expect(payment).toMatchObject({
      subscriptionId: "sub-1",
      planId: "commerce",
      amount: 9900,
      currency: "MXN",
      status: "pending",
    });
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("plan_id");
    expect(fake.statements[0]?.params).toEqual([
      payment.id,
      "sub-1",
      "commerce",
      9900,
      "MXN",
      toEpoch(payment.createdAt),
      toEpoch(payment.updatedAt),
    ]);
  });

  it("updates payment status without throwing", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repo = new D1PaymentRepository(fake.db);

    await expect(
      repo.updateStatus("pay-1", "completed", new Date("2026-01-15")),
    ).resolves.toBeUndefined();
  });

  it("updates payment status to failed without paidAt", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repo = new D1PaymentRepository(fake.db);

    await expect(repo.updateStatus("pay-1", "failed")).resolves.toBeUndefined();
  });

  it("issues UPDATE payments SET status with the right id and status", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repo = new D1PaymentRepository(fake.db);

    await repo.updateStatus("pay-1", "completed", new Date("2026-01-15"));

    expect(normalizeSql(fake.statements[0]?.sql)).toContain("UPDATE payments SET status");
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("WHERE id = ?");
    expect(fake.statements[0]?.params).toContain("pay-1");
    expect(fake.statements[0]?.params).toContain("completed");
  });

  it("keeps a legacy payment that has no plan snapshot", async () => {
    const fake = new FakeD1Database(() => ({ first: { ...sampleRow, plan_id: null } }));
    const repo = new D1PaymentRepository(fake.db);

    expect((await repo.getById("pay-1"))?.planId).toBeNull();
  });

  it("throws DataIntegrityError when a stored plan id is unknown", async () => {
    const fake = new FakeD1Database(() => ({ first: { ...sampleRow, plan_id: "enterprise" } }));
    const repo = new D1PaymentRepository(fake.db);

    await expect(repo.getById("pay-1")).rejects.toBeInstanceOf(DataIntegrityError);
  });
});
