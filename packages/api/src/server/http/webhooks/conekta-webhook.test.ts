import { generateKeyPairSync, sign } from "node:crypto";
import { InMemoryPaymentEventRepository } from "@aqui-suena/api/infrastructure/memory/billing/in-memory-payment-event-repository";
import { InMemoryPaymentRepository } from "@aqui-suena/api/infrastructure/memory/billing/in-memory-payment-repository";
import {
  type ConektaWebhookDependencies,
  handleConektaWebhook,
  isWebhookBodyTooLarge,
  MAX_WEBHOOK_BODY_BYTES,
  type PaymentWebhookService,
} from "@aqui-suena/api/server/http/webhooks/conekta-webhook";
import { describe, expect, it } from "vitest";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

const NOW = new Date("2026-11-19T12:00:00Z");
const EVENT_TS = Math.floor(NOW.getTime() / 1000);

function signBody(body: string): string {
  return sign("sha256", Buffer.from(body), privateKey).toString("base64");
}

class FakeWebhookService implements PaymentWebhookService {
  readonly calls: Array<{
    method: "complete" | "fail" | "expire";
    paymentId: string;
    at?: Date;
    reason?: string;
  }> = [];
  error: Error | null = null;

  readonly complete = {
    execute: async (paymentId: string, paidAt?: Date): Promise<null> => {
      this.calls.push({ method: "complete", paymentId, at: paidAt });

      if (this.error !== null) throw this.error;

      return null;
    },
  };

  readonly fail = {
    execute: async (paymentId: string, reason: string, at?: Date): Promise<null> => {
      this.calls.push({ method: "fail", paymentId, at, reason });

      if (this.error !== null) throw this.error;

      return null;
    },
  };

  readonly expire = {
    execute: async (paymentId: string, at?: Date): Promise<null> => {
      this.calls.push({ method: "expire", paymentId, at });

      if (this.error !== null) throw this.error;

      return null;
    },
  };
}

async function setup() {
  const payments = new InMemoryPaymentRepository();

  const payment = await payments.create({
    accountId: "acc-1",
    planId: "trades",
    billingInterval: "monthly",
    method: "card",
    idempotencyKey: "idem-1",
    amount: 9900,
    currency: "MXN",
    periodStart: NOW,
    periodEnd: new Date("2026-12-19T12:00:00Z"),
  });

  await payments.applyProviderResult(payment.id, {
    providerOrderId: "ord-1",
    providerChargeId: "chg-1",
    reference: null,
    nextActionUrl: null,
    expiresAt: null,
    failureReason: null,
  });

  const events = new InMemoryPaymentEventRepository();
  const service = new FakeWebhookService();
  const errors: string[] = [];

  const deps: ConektaWebhookDependencies = {
    payments,
    events,
    service,
    publicKey: publicKeyPem,
    livemode: false,
    now: () => NOW,
    onError: (message) => errors.push(message),
  };

  return { payments, payment, events, service, errors, deps };
}

function orderEvent(
  type: string,
  paymentId: string,
  objectOverrides: Record<string, unknown> = {},
  livemode = false,
): string {
  return JSON.stringify({
    id: `evt-${type}`,
    type,
    livemode,
    created_at: EVENT_TS,
    data: {
      object: {
        object: "order",
        id: "ord-1",
        amount: 9900,
        currency: "MXN",
        metadata: { payment_id: paymentId },
        ...objectOverrides,
      },
    },
  });
}

function chargeEvent(type: string, objectOverrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: `evt-${type}`,
    type,
    livemode: false,
    created_at: EVENT_TS,
    data: {
      object: {
        object: "charge",
        id: "chg-1",
        order_id: "ord-1",
        amount: 9900,
        currency: "MXN",
        failure_message: "insufficient_funds",
        ...objectOverrides,
      },
    },
  });
}

describe("handleConektaWebhook", () => {
  it("rejects a missing digest without recording the event", async () => {
    const { events, deps } = await setup();
    const body = orderEvent("order.paid", "ignored");

    expect(await handleConektaWebhook(body, undefined, deps)).toBe(401);
    expect(await events.getByProviderEventId("evt-order.paid")).toBeNull();
  });

  it("rejects an invalid signature", async () => {
    const { events, deps } = await setup();
    const body = orderEvent("order.paid", "ignored");

    expect(await handleConektaWebhook(body, signBody(`${body} `), deps)).toBe(401);
    expect(await events.getByProviderEventId("evt-order.paid")).toBeNull();
  });

  it("completes a paid order and marks the event processed", async () => {
    const { payment, events, service, deps } = await setup();
    const body = orderEvent("order.paid", payment.id);

    expect(await handleConektaWebhook(body, signBody(body), deps)).toBe(200);
    expect(service.calls).toEqual([{ method: "complete", paymentId: payment.id, at: NOW }]);
    expect(await events.getByProviderEventId("evt-order.paid")).toMatchObject({
      paymentId: payment.id,
      livemode: false,
      processedAt: NOW,
    });
  });

  it("does not process a duplicate event twice", async () => {
    const { payment, service, deps } = await setup();
    const body = orderEvent("order.paid", payment.id);

    await handleConektaWebhook(body, signBody(body), deps);

    expect(await handleConektaWebhook(body, signBody(body), deps)).toBe(200);
    expect(service.calls).toHaveLength(1);
  });

  it("retries an event that was recorded but not processed", async () => {
    const { payment, events, service, deps } = await setup();
    const body = orderEvent("order.paid", payment.id);

    await events.record({
      providerEventId: "evt-order.paid",
      type: "order.paid",
      paymentId: null,
      payloadHash: "stored-hash",
      livemode: false,
    });

    expect(await handleConektaWebhook(body, signBody(body), deps)).toBe(200);
    expect(service.calls).toHaveLength(1);
    expect((await events.getByProviderEventId("evt-order.paid"))?.processedAt).toEqual(NOW);
  });

  it("ignores an event from the other livemode", async () => {
    const { payment, events, service, deps } = await setup();
    const body = orderEvent("order.paid", payment.id, {}, true);

    expect(await handleConektaWebhook(body, signBody(body), deps)).toBe(200);
    expect(service.calls).toHaveLength(0);
    expect(await events.getByProviderEventId("evt-order.paid")).toMatchObject({
      livemode: true,
      processedAt: NOW,
    });
  });

  it("ignores an event for an unknown payment", async () => {
    const { events, service, deps } = await setup();
    const body = orderEvent("order.paid", "missing", {
      id: "ord-unknown",
      metadata: { payment_id: "missing" },
    });

    expect(await handleConektaWebhook(body, signBody(body), deps)).toBe(200);
    expect(service.calls).toHaveLength(0);
    expect(await events.getByProviderEventId("evt-order.paid")).toMatchObject({
      paymentId: null,
      processedAt: NOW,
    });
  });

  it("ignores an amount or currency mismatch", async () => {
    const { payment, events, service, deps } = await setup();
    const body = orderEvent("order.paid", payment.id, { amount: 1 });

    expect(await handleConektaWebhook(body, signBody(body), deps)).toBe(200);
    expect(service.calls).toHaveLength(0);
    expect(await events.getByProviderEventId("evt-order.paid")).toMatchObject({
      paymentId: payment.id,
      processedAt: NOW,
    });
  });

  it("expires an expired order", async () => {
    const { payment, service, deps } = await setup();
    const body = orderEvent("order.expired", payment.id);

    expect(await handleConektaWebhook(body, signBody(body), deps)).toBe(200);
    expect(service.calls).toEqual([{ method: "expire", paymentId: payment.id, at: NOW }]);
  });

  it("fails a declined charge with its reason", async () => {
    const { payment, service, deps } = await setup();
    const body = chargeEvent("charge.declined");

    expect(await handleConektaWebhook(body, signBody(body), deps)).toBe(200);
    expect(service.calls).toEqual([
      {
        method: "fail",
        paymentId: payment.id,
        at: NOW,
        reason: "insufficient_funds",
      },
    ]);
  });

  it("records a refund without changing the subscription", async () => {
    const { payment, events, service, deps } = await setup();
    const body = chargeEvent("charge.refunded");

    expect(await handleConektaWebhook(body, signBody(body), deps)).toBe(200);
    expect(service.calls).toHaveLength(0);
    expect(await events.getByProviderEventId("evt-charge.refunded")).toMatchObject({
      paymentId: payment.id,
      processedAt: NOW,
    });
  });

  it("rejects malformed JSON even with a valid signature", async () => {
    const { deps } = await setup();
    const body = "{not-json";

    expect(await handleConektaWebhook(body, signBody(body), deps)).toBe(400);
  });

  it("rejects an event without id or type", async () => {
    const { deps } = await setup();
    const body = JSON.stringify({ livemode: false, data: { object: {} } });

    expect(await handleConektaWebhook(body, signBody(body), deps)).toBe(400);
  });

  it("leaves the event unprocessed when the state change fails", async () => {
    const { payment, events, service, deps } = await setup();
    const body = orderEvent("order.paid", payment.id);
    service.error = new Error("boom");

    expect(await handleConektaWebhook(body, signBody(body), deps)).toBe(500);
    expect((await events.getByProviderEventId("evt-order.paid"))?.processedAt).toBeNull();

    service.error = null;

    expect(await handleConektaWebhook(body, signBody(body), deps)).toBe(200);
    expect(service.calls).toHaveLength(2);
    expect((await events.getByProviderEventId("evt-order.paid"))?.processedAt).toEqual(NOW);
  });
});

describe("isWebhookBodyTooLarge", () => {
  it("allows a body at or under the cap", () => {
    expect(isWebhookBodyTooLarge("1000")).toBe(false);
    expect(isWebhookBodyTooLarge(String(MAX_WEBHOOK_BODY_BYTES))).toBe(false);
  });

  it("rejects a body over the cap", () => {
    expect(isWebhookBodyTooLarge(String(MAX_WEBHOOK_BODY_BYTES + 1))).toBe(true);
  });

  it("allows a missing or malformed content length", () => {
    expect(isWebhookBodyTooLarge(undefined)).toBe(false);
    expect(isWebhookBodyTooLarge(null)).toBe(false);
    expect(isWebhookBodyTooLarge("")).toBe(false);
    expect(isWebhookBodyTooLarge("not-a-number")).toBe(false);
  });
});
