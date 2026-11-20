import { D1PaymentRepository } from "@aqui-suena/api/infrastructure/billing/payments/d1-payment-repository";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { normalizeSql } from "@aqui-suena/api/testing/sql";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "pay-1",
  account_id: "acc-1",
  subscription_id: "sub-1",
  plan_id: "commerce",
  billing_interval: "annual",
  method: "card",
  provider: "conekta",
  provider_order_id: "ord-1",
  provider_charge_id: "chg-1",
  idempotency_key: "idem-1",
  amount: 149000,
  currency: "MXN",
  status: "completed",
  reference: null,
  next_action_url: null,
  expires_at: null,
  failure_reason: null,
  period_start: 1700000000,
  period_end: 1731536000,
  paid_at: 1700000100,
  created_at: 1700000000,
  updated_at: 1700000100,
};

describe("D1PaymentRepository", () => {
  it("maps every stored column into a payment", async () => {
    const fake = new FakeD1Database(() => ({ first: sampleRow }));
    const repo = new D1PaymentRepository(fake.db);

    const payment = await repo.getById("pay-1");

    expect(payment).toMatchObject({
      id: "pay-1",
      accountId: "acc-1",
      subscriptionId: "sub-1",
      planId: "commerce",
      billingInterval: "annual",
      method: "card",
      provider: "conekta",
      providerOrderId: "ord-1",
      providerChargeId: "chg-1",
      idempotencyKey: "idem-1",
      amount: 149000,
      currency: "MXN",
      status: "completed",
      reference: null,
      nextActionUrl: null,
      expiresAt: null,
      failureReason: null,
      periodStart: new Date(1700000000 * 1000),
      periodEnd: new Date(1731536000 * 1000),
      paidAt: new Date(1700000100 * 1000),
      createdAt: new Date(1700000000 * 1000),
      updatedAt: new Date(1700000100 * 1000),
    });
  });

  it("keeps a legacy payment without a plan snapshot", async () => {
    const fake = new FakeD1Database(() => ({ first: { ...sampleRow, plan_id: null } }));
    const repo = new D1PaymentRepository(fake.db);

    expect((await repo.getById("pay-1"))?.planId).toBeNull();
  });

  it.each([
    ["status", { status: "unknown" }],
    ["method", { method: "unknown" }],
    ["billingInterval", { billing_interval: "weekly" }],
    ["provider", { provider: "stripe" }],
    ["planId", { plan_id: "enterprise" }],
  ])("throws DataIntegrityError for an unknown %s", async (_field, override) => {
    const fake = new FakeD1Database(() => ({ first: { ...sampleRow, ...override } }));
    const repo = new D1PaymentRepository(fake.db);

    await expect(repo.getById("pay-1")).rejects.toBeInstanceOf(DataIntegrityError);
  });

  it("returns null for a non-existent payment", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repo = new D1PaymentRepository(fake.db);

    expect(await repo.getById("missing")).toBeNull();
  });

  it("finds a payment by idempotency key and by provider order id", async () => {
    const fake = new FakeD1Database(() => ({ first: sampleRow }));
    const repo = new D1PaymentRepository(fake.db);

    expect((await repo.getByIdempotencyKey("idem-1"))?.id).toBe("pay-1");
    expect((await repo.getByProviderOrderId("ord-1"))?.id).toBe("pay-1");

    expect(normalizeSql(fake.statements[0]?.sql)).toContain("WHERE idempotency_key = ?");
    expect(normalizeSql(fake.statements[1]?.sql)).toContain("WHERE provider_order_id = ?");
  });

  it("creates a pending payment with its period", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repo = new D1PaymentRepository(fake.db);
    const periodStart = new Date("2026-11-19T12:00:00Z");
    const periodEnd = new Date("2026-12-19T12:00:00Z");

    const payment = await repo.create({
      accountId: "acc-1",
      planId: "trades",
      billingInterval: "monthly",
      method: "card",
      idempotencyKey: "idem-1",
      amount: 9900,
      currency: "MXN",
      periodStart,
      periodEnd,
    });

    expect(payment).toMatchObject({
      accountId: "acc-1",
      subscriptionId: null,
      planId: "trades",
      billingInterval: "monthly",
      method: "card",
      provider: "conekta",
      providerOrderId: null,
      status: "pending",
      amount: 9900,
      currency: "MXN",
      periodStart,
      periodEnd,
      paidAt: null,
    });
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("INSERT INTO payments");
    expect(fake.statements[0]?.params).toEqual([
      payment.id,
      "acc-1",
      "trades",
      "monthly",
      "card",
      "idem-1",
      9900,
      "MXN",
      toEpoch(periodStart),
      toEpoch(periodEnd),
      toEpoch(payment.createdAt),
      toEpoch(payment.updatedAt),
    ]);
  });

  it("finds the last open intent for the account, plan, interval and method", async () => {
    const fake = new FakeD1Database(() => ({ first: sampleRow }));
    const repo = new D1PaymentRepository(fake.db);

    const payment = await repo.findOpenIntent({
      accountId: "acc-1",
      planId: "commerce",
      billingInterval: "annual",
      method: "card",
    });

    expect(payment?.id).toBe("pay-1");
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("status = 'pending'");
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("ORDER BY created_at DESC");
    expect(fake.statements[0]?.params).toEqual(["acc-1", "commerce", "annual", "card"]);
  });

  it("applies the provider result to a payment", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repo = new D1PaymentRepository(fake.db);
    const expiresAt = new Date("2026-11-26T12:00:00Z");

    await repo.applyProviderResult("pay-1", {
      providerOrderId: "ord-1",
      providerChargeId: "chg-1",
      reference: "ref-1",
      nextActionUrl: "https://3ds.example/1",
      expiresAt,
      failureReason: null,
    });

    expect(normalizeSql(fake.statements[0]?.sql)).toContain("SET provider_order_id = ?");
    expect(fake.statements[0]?.params).toEqual([
      "ord-1",
      "chg-1",
      "ref-1",
      "https://3ds.example/1",
      toEpoch(expiresAt),
      null,
      expect.any(Number),
      "pay-1",
    ]);
  });

  it("claims completion with a compare-and-set", async () => {
    const fake = new FakeD1Database(() => ({ run: { changes: 1 } }));
    const repo = new D1PaymentRepository(fake.db);
    const paidAt = new Date("2026-11-19T13:00:00Z");

    expect(await repo.claimCompletion("pay-1", paidAt)).toBe(true);
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("status = 'completed'");
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("AND status = 'pending'");
    expect(fake.statements[0]?.params).toEqual([toEpoch(paidAt), expect.any(Number), "pay-1"]);
  });

  it("reports a lost compare-and-set", async () => {
    const fake = new FakeD1Database(() => ({ run: { changes: 0 } }));
    const repo = new D1PaymentRepository(fake.db);

    expect(await repo.claimCompletion("pay-1", new Date())).toBe(false);
    expect(await repo.markFailed("pay-1", "declined", new Date())).toBe(false);
    expect(await repo.markExpired("pay-1", new Date())).toBe(false);
  });

  it("marks a payment failed and expired with their timestamps", async () => {
    const fake = new FakeD1Database(() => ({ run: { changes: 1 } }));
    const repo = new D1PaymentRepository(fake.db);
    const at = new Date("2026-11-19T13:00:00Z");

    expect(await repo.markFailed("pay-1", "declined", at)).toBe(true);
    expect(await repo.markExpired("pay-1", at)).toBe(true);

    expect(normalizeSql(fake.statements[0]?.sql)).toContain("status = 'failed'");
    expect(normalizeSql(fake.statements[1]?.sql)).toContain("status = 'expired'");
    expect(fake.statements[0]?.params).toEqual(["declined", toEpoch(at), "pay-1"]);
    expect(fake.statements[1]?.params).toEqual([toEpoch(at), "pay-1"]);
  });

  it("attaches a subscription only once", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repo = new D1PaymentRepository(fake.db);

    await repo.attachSubscription("pay-1", "sub-1");

    expect(normalizeSql(fake.statements[0]?.sql)).toContain("subscription_id IS NULL");
    expect(fake.statements[0]?.params).toEqual(["sub-1", expect.any(Number), "pay-1"]);
  });

  it("releases a claimed completion only when no subscription is attached", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repo = new D1PaymentRepository(fake.db);

    await repo.releaseCompletion("pay-1");

    expect(normalizeSql(fake.statements[0]?.sql)).toContain("status = 'pending'");
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("subscription_id IS NULL");
    expect(fake.statements[0]?.params).toEqual([expect.any(Number), "pay-1"]);
  });

  it("lists pending payments for an account", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repo = new D1PaymentRepository(fake.db);

    const payments = await repo.listPendingByAccount("acc-1");

    expect(payments).toHaveLength(1);
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("account_id = ?");
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("status = 'pending'");
    expect(fake.statements[0]?.params).toEqual(["acc-1"]);
  });

  it("lists pending payments with a provider order up to the limit", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repo = new D1PaymentRepository(fake.db);

    const payments = await repo.listPendingWithProviderOrder(5);

    expect(payments).toHaveLength(1);
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("provider_order_id IS NOT NULL");
    expect(fake.statements[0]?.params).toEqual([5]);
  });

  it("lists payments by subscription", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repo = new D1PaymentRepository(fake.db);

    const payments = await repo.listBySubscription("sub-1");

    expect(payments).toHaveLength(1);
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("ORDER BY created_at DESC");
    expect(fake.statements[0]?.params).toEqual(["sub-1"]);
  });
});
