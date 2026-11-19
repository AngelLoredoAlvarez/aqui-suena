import { D1PaymentEventRepository } from "@aqui-suena/api/infrastructure/billing/payments/d1-payment-event-repository";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { normalizeSql } from "@aqui-suena/api/testing/sql";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "evt-row-1",
  provider_event_id: "evt-1",
  type: "order.paid",
  payment_id: "pay-1",
  payload_hash: "hash-1",
  livemode: 1,
  processed_at: 1700000100,
  created_at: 1700000000,
};

describe("D1PaymentEventRepository", () => {
  it("maps a stored event", async () => {
    const fake = new FakeD1Database(() => ({ first: sampleRow }));
    const repo = new D1PaymentEventRepository(fake.db);

    expect(await repo.getByProviderEventId("evt-1")).toMatchObject({
      id: "evt-row-1",
      providerEventId: "evt-1",
      type: "order.paid",
      paymentId: "pay-1",
      payloadHash: "hash-1",
      livemode: true,
      processedAt: new Date(1700000100 * 1000),
      createdAt: new Date(1700000000 * 1000),
    });
  });

  it("handles an unprocessed event and a live mode flag", async () => {
    const fake = new FakeD1Database(() => ({
      first: { ...sampleRow, livemode: 0, processed_at: null },
    }));

    const repo = new D1PaymentEventRepository(fake.db);

    const event = await repo.getByProviderEventId("evt-1");

    expect(event?.livemode).toBe(false);
    expect(event?.processedAt).toBeNull();
  });

  it("returns null for an unknown event", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));
    const repo = new D1PaymentEventRepository(fake.db);

    expect(await repo.getByProviderEventId("missing")).toBeNull();
  });

  it("inserts or ignores the event and reads it back", async () => {
    const fake = new FakeD1Database(() => ({
      first: sampleRow,
      run: { success: true, changes: 1 },
    }));

    const repo = new D1PaymentEventRepository(fake.db);

    const event = await repo.record({
      providerEventId: "evt-1",
      type: "order.paid",
      paymentId: null,
      payloadHash: "hash-1",
      livemode: true,
    });

    expect(event.id).toBe("evt-row-1");
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("INSERT OR IGNORE INTO payment_events");
    expect(fake.statements[0]?.params).toEqual([
      expect.any(String),
      "evt-1",
      "order.paid",
      null,
      "hash-1",
      1,
      expect.any(Number),
    ]);
  });

  it("marks an event processed", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true } }));
    const repo = new D1PaymentEventRepository(fake.db);
    const processedAt = new Date("2026-11-19T12:05:00Z");

    await repo.markProcessed("evt-row-1", "pay-1", processedAt);

    expect(normalizeSql(fake.statements[0]?.sql)).toContain(
      "UPDATE payment_events SET payment_id = ?, processed_at = ?",
    );
    expect(fake.statements[0]?.params).toEqual(["pay-1", toEpoch(processedAt), "evt-row-1"]);
  });
});
