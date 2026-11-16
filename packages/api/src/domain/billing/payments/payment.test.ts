import {
  InMemoryPaymentRepository,
  parsePaymentStatus,
} from "@aqui-suena/api/domain/billing/payments/payment";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

describe("parsePaymentStatus", () => {
  it.each(["pending", "completed", "failed", "refunded"])(
    "accepts the valid status %s",
    (status) => {
      expect(parsePaymentStatus(status)).toBe(status);
    },
  );

  it.each(["unknown", "", "PAID"])("rejects the unknown status %s", (value) => {
    expect(() => parsePaymentStatus(value)).toThrow(DataIntegrityError);
  });

  it.each([null, 3, {}])("rejects the non-string value %s", (value) => {
    expect(() => parsePaymentStatus(value)).toThrow(DataIntegrityError);
  });

  it("carries the field and the offending value", () => {
    let thrown: unknown;
    try {
      parsePaymentStatus("unknown");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(DataIntegrityError);
    expect(thrown).toMatchObject({ field: "status", value: "unknown" });
  });
});

describe("InMemoryPaymentRepository", () => {
  it("creates a payment with pending status", async () => {
    const repo = new InMemoryPaymentRepository();

    const payment = await repo.create("sub-1", 4900, "MXN");

    expect(payment.subscriptionId).toBe("sub-1");
    expect(payment.amount).toBe(4900);
    expect(payment.currency).toBe("MXN");
    expect(payment.status).toBe("pending");
    expect(payment.paidAt).toBeNull();
    expect(payment.id).toBeTruthy();
  });

  it("updates payment status to completed with paidAt", async () => {
    const repo = new InMemoryPaymentRepository();

    const payment = await repo.create("sub-1", 4900, "MXN");

    const paidAt = new Date("2026-01-15");

    await repo.updateStatus(payment.id, "completed", paidAt);

    const updated = await repo.getById(payment.id);

    expect(updated?.status).toBe("completed");
    expect(updated?.paidAt).toEqual(paidAt);
  });

  it("lists payments by subscription", async () => {
    const repo = new InMemoryPaymentRepository();

    await repo.create("sub-1", 4900, "MXN");

    await repo.create("sub-1", 4900, "MXN");

    await repo.create("sub-2", 9900, "MXN");

    const list = await repo.listBySubscription("sub-1");

    expect(list).toHaveLength(2);
  });

  it("returns null for non-existent payment", async () => {
    const repo = new InMemoryPaymentRepository();

    const payment = await repo.getById("non-existent");

    expect(payment).toBeNull();
  });
});
