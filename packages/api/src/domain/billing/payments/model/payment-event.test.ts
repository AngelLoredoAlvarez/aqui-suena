import { InMemoryPaymentEventRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-payment-event-repository";
import { describe, expect, it } from "vitest";

const input = {
  providerEventId: "evt-1",
  type: "order.paid",
  paymentId: null,
  payloadHash: "hash-1",
  livemode: false,
};

describe("InMemoryPaymentEventRepository", () => {
  it("records an event once and returns the existing row on a replay", async () => {
    const repo = new InMemoryPaymentEventRepository();

    const first = await repo.record(input);
    const second = await repo.record(input);

    expect(second.id).toBe(first.id);
    expect(first).toMatchObject({
      providerEventId: "evt-1",
      type: "order.paid",
      paymentId: null,
      payloadHash: "hash-1",
      livemode: false,
      processedAt: null,
    });
  });

  it("finds an event by provider event id", async () => {
    const repo = new InMemoryPaymentEventRepository();
    const event = await repo.record(input);

    expect((await repo.getByProviderEventId("evt-1"))?.id).toBe(event.id);
    expect(await repo.getByProviderEventId("missing")).toBeNull();
  });

  it("marks an event processed with its payment and time", async () => {
    const repo = new InMemoryPaymentEventRepository();
    const event = await repo.record(input);
    const processedAt = new Date("2026-11-19T12:05:00Z");

    await repo.markProcessed(event.id, "pay-1", processedAt);

    expect(await repo.getByProviderEventId("evt-1")).toMatchObject({
      paymentId: "pay-1",
      processedAt,
    });
  });
});
