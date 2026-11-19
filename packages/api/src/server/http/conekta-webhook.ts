import type { Payment, PaymentRepository } from "@aqui-suena/api/domain/billing/payments/payment";
import type { PaymentEventRepository } from "@aqui-suena/api/domain/billing/payments/payment-event";
import { verifyConektaWebhook } from "@aqui-suena/api/infrastructure/billing/conekta/conekta-webhook-verifier";
import type { Handler } from "hono";

export interface PaymentWebhookService {
  complete(paymentId: string, paidAt?: Date): Promise<unknown>;
  fail(paymentId: string, reason: string, at?: Date): Promise<unknown>;
  expire(paymentId: string, at?: Date): Promise<unknown>;
}

export type ConektaWebhookDependencies = {
  readonly payments: Pick<PaymentRepository, "getById" | "getByProviderOrderId">;
  readonly events: PaymentEventRepository;
  readonly service: PaymentWebhookService;
  readonly publicKey: string;
  readonly livemode: boolean;
  readonly now?: () => Date;
  readonly onError?: (message: string) => void;
};

type ParsedEvent = {
  readonly id: string;
  readonly type: string;
  readonly livemode: boolean;
  readonly createdAt: Date | null;
  readonly object: Record<string, unknown>;
};

export async function handleConektaWebhook(
  rawBody: string,
  digest: string | undefined,
  deps: ConektaWebhookDependencies,
): Promise<number> {
  if (digest === undefined || digest.length === 0) return 401;

  const valid = await verifyConektaWebhook(rawBody, digest, deps.publicKey);

  if (!valid) return 401;

  const event = parseEvent(rawBody);

  if (event === null) return 400;

  const now = deps.now?.() ?? new Date();

  try {
    const payloadHash = await hashPayload(rawBody);
    const existing = await deps.events.getByProviderEventId(event.id);

    if (existing !== null && existing.processedAt !== null) return 200;

    const record =
      existing ??
      (await deps.events.record({
        providerEventId: event.id,
        type: event.type,
        paymentId: null,
        payloadHash,
        livemode: event.livemode,
      }));

    if (event.livemode !== deps.livemode) {
      await deps.events.markProcessed(record.id, null, now);

      deps.onError?.("Conekta webhook ignored: livemode mismatch");

      return 200;
    }

    const payment = await findPayment(event.object, deps.payments);

    if (payment === null) {
      await deps.events.markProcessed(record.id, null, now);

      deps.onError?.("Conekta webhook ignored: unknown payment");

      return 200;
    }

    if (!amountMatches(event.object, payment)) {
      await deps.events.markProcessed(record.id, payment.id, now);

      deps.onError?.("Conekta webhook ignored: amount or currency mismatch");

      return 200;
    }

    switch (event.type) {
      case "order.paid":
      case "charge.paid":
        await deps.service.complete(payment.id, event.createdAt ?? now);
        break;
      case "order.expired":
        await deps.service.expire(payment.id, now);
        break;
      case "charge.declined":
        await deps.service.fail(payment.id, failureReason(event.object), now);
        break;
      default:
        break;
    }

    await deps.events.markProcessed(record.id, payment.id, now);

    return 200;
  } catch (error) {
    deps.onError?.(
      `Conekta webhook failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return 500;
  }
}

export function createConektaWebhookHandler(deps: ConektaWebhookDependencies): Handler {
  return async (context) => {
    const status = await handleConektaWebhook(
      await context.req.text(),
      context.req.header("digest"),
      deps,
    );

    return context.text(status === 200 ? "ok" : "error", status as 200 | 400 | 401 | 500);
  };
}

function parseEvent(rawBody: string): ParsedEvent | null {
  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }

  if (typeof body !== "object" || body === null) return null;

  const event = body as Record<string, unknown>;
  const data = event.data;

  if (typeof event.id !== "string" || event.id.length === 0) return null;
  if (typeof event.type !== "string" || event.type.length === 0) return null;
  if (typeof event.livemode !== "boolean") return null;
  if (typeof data !== "object" || data === null) return null;

  const object = (data as Record<string, unknown>).object;

  if (typeof object !== "object" || object === null) return null;

  return {
    id: event.id,
    type: event.type,
    livemode: event.livemode,
    createdAt: typeof event.created_at === "number" ? new Date(event.created_at * 1000) : null,
    object: object as Record<string, unknown>,
  };
}

async function findPayment(
  object: Record<string, unknown>,
  payments: Pick<PaymentRepository, "getById" | "getByProviderOrderId">,
): Promise<Payment | null> {
  const metadataPaymentId = metadataId(object);

  if (metadataPaymentId !== null) {
    const byId = await payments.getById(metadataPaymentId);

    if (byId !== null) return byId;
  }

  const orderId = orderIdOf(object);

  return orderId === null ? null : payments.getByProviderOrderId(orderId);
}

function metadataId(object: Record<string, unknown>): string | null {
  const metadata = object.metadata;

  if (typeof metadata !== "object" || metadata === null) return null;

  const id = (metadata as Record<string, unknown>).payment_id;

  return typeof id === "string" ? id : null;
}

function orderIdOf(object: Record<string, unknown>): string | null {
  if (object.object === "order" && typeof object.id === "string") return object.id;

  return typeof object.order_id === "string" ? object.order_id : null;
}

function amountMatches(object: Record<string, unknown>, payment: Payment): boolean {
  return object.amount === payment.amount && object.currency === payment.currency;
}

function failureReason(object: Record<string, unknown>): string {
  if (typeof object.failure_message === "string") return object.failure_message;

  return typeof object.failure_code === "string" ? object.failure_code : "declined";
}

async function hashPayload(rawBody: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody));

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
