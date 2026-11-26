import type {
  CardDetails,
  CardSource,
  ChargeResult,
  ChargeStatus,
  CreateCardSourceInput,
  CreateChargeInput,
  PaymentCustomer,
  PaymentProvider,
} from "@aqui-suena/api/domain/billing/payments/ports/payment-provider";
import { PaymentProviderRejection } from "@aqui-suena/api/domain/billing/payments/ports/payment-provider";

const DEFAULT_BASE_URL = "https://api.conekta.io";
const API_VERSION = "application/vnd.conekta-v2.3.0+json";

type ConektaPaymentMethod = {
  type?: string;
  reference?: string;
  clabe?: string;
  receiving_account_number?: string;
  expires_at?: number;
  brand?: string;
  last4?: string;
  exp_month?: string;
  exp_year?: string;
};

type ConektaCharge = {
  id?: string;
  status?: string;
  failure_message?: string | null;
  failure_code?: string | null;
  payment_method?: ConektaPaymentMethod;
};

type ConektaOrder = {
  id?: string;
  payment_status?: string;
  charges?: { data?: ConektaCharge[] };
  next_action?: { redirect_to_url?: { url?: string } };
};

type ConektaCustomer = {
  id?: string;
  payment_sources?: {
    data?: Array<{
      id?: string;
      type?: string;
      brand?: string;
      last4?: string;
      exp_month?: string;
      exp_year?: string;
    }>;
  };
};

type ConektaError = {
  message?: string;
  details?: Array<{ message?: string; debug_message?: string; code?: string }>;
};

export type ConektaPaymentProviderDependencies = {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
};

export class ConektaPaymentProvider implements PaymentProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly injectedFetch: typeof fetch | undefined;

  constructor(deps: ConektaPaymentProviderDependencies) {
    this.apiKey = deps.apiKey;
    this.baseUrl = (deps.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.injectedFetch = deps.fetch;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.request(`/customers/${encodeURIComponent(customerId)}`, {
      method: "DELETE",
      headers: this.headers(),
    });
  }

  async createCardSource(input: CreateCardSourceInput): Promise<CardSource> {
    const response = await this.request("/customers", {
      method: "POST",
      headers: this.headers(input.idempotencyKey),
      body: JSON.stringify({
        ...customerInfo(input.customer),
        payment_sources: [{ type: "card", token_id: input.token }],
      }),
    });

    const customer = response as ConektaCustomer;
    const source = customer.payment_sources?.data?.[0];

    if (typeof customer.id !== "string" || typeof source?.id !== "string") {
      throw new PaymentProviderRejection("Malformed response from the payment provider");
    }

    const card = mapCard(source);

    return {
      customerId: customer.id,
      sourceId: source.id,
      ...(card === undefined ? {} : { card }),
    };
  }

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    const response = await this.requestResult("/orders", {
      method: "POST",
      headers: this.headers(input.idempotencyKey),
      body: JSON.stringify({
        currency: input.currency,
        customer_info: input.savedCard
          ? { customer_id: input.savedCard.customerId }
          : customerInfo(input.customer),
        line_items: [{ name: input.description, unit_price: input.amount, quantity: 1 }],
        charges: [{ payment_method: this.paymentMethod(input) }],
        metadata: { payment_id: input.paymentId },
        ...(input.method === "card" && input.returnUrl !== undefined
          ? { three_ds_mode: "smart", return_url: input.returnUrl }
          : {}),
      }),
    });

    // A declined card is a business outcome, not a transport failure: Conekta
    // answers 402 with a bank decline code and no order to map. Other 402
    // processing errors, such as a used token, stay provider rejections.
    if (
      !response.ok &&
      response.status === 402 &&
      input.method === "card" &&
      isDeclineCode(errorCode(response.body))
    ) {
      return {
        providerOrderId: null,
        providerChargeId: null,
        status: "declined",
        reference: null,
        nextActionUrl: null,
        expiresAt: null,
        failureReason: errorDetail(response.body) ?? "Card declined",
      };
    }

    if (!response.ok) {
      throw new PaymentProviderRejection(
        errorDetail(response.body) ?? `Conekta request failed with ${response.status}`,
      );
    }

    return mapOrder(response.body);
  }

  async getOrder(providerOrderId: string): Promise<ChargeResult> {
    const response = await this.request(`/orders/${encodeURIComponent(providerOrderId)}`, {
      method: "GET",
      headers: this.headers(),
    });

    return mapOrder(response);
  }

  private headers(idempotencyKey?: string): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: API_VERSION,
      "Content-Type": "application/json",
      ...(idempotencyKey === undefined ? {} : { "Idempotency-Key": idempotencyKey }),
    };
  }

  private paymentMethod(input: CreateChargeInput): Record<string, unknown> {
    if (input.method === "card") {
      if (input.savedCard !== undefined) {
        return { type: "card", payment_source_id: input.savedCard.sourceId };
      }

      return { type: "card", token_id: input.cardToken };
    }

    const expiresAt =
      input.expiresAt === undefined ? undefined : Math.floor(input.expiresAt.getTime() / 1000);

    return {
      type: input.method === "cash" ? "cash" : "spei",
      ...(expiresAt === undefined ? {} : { expires_at: expiresAt }),
    };
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const response = await this.requestResult(path, init);

    if (!response.ok) {
      throw new PaymentProviderRejection(
        errorDetail(response.body) ?? `Conekta request failed with ${response.status}`,
      );
    }

    return response.body;
  }

  private async requestResult(
    path: string,
    init: RequestInit,
  ): Promise<{ readonly ok: boolean; readonly status: number; readonly body: unknown }> {
    const fetchImpl = this.injectedFetch ?? fetch;
    const response = await fetchImpl(`${this.baseUrl}${path}`, init);
    const body = await readJson(response);

    return { ok: response.ok, status: response.status, body };
  }
}

function customerInfo(customer: PaymentCustomer): Record<string, string> {
  return {
    name: customer.name,
    email: customer.email,
    ...(customer.phone === undefined ? {} : { phone: customer.phone }),
  };
}

function mapOrder(body: unknown): ChargeResult {
  if (typeof body !== "object" || body === null) {
    throw new PaymentProviderRejection("Malformed response from the payment provider");
  }

  const order = body as ConektaOrder;

  if (typeof order.id !== "string" || order.id.length === 0) {
    throw new PaymentProviderRejection("Malformed response from the payment provider");
  }

  const charge = order.charges?.data?.[0];
  const method = charge?.payment_method;
  const card = mapCard(method);

  return {
    providerOrderId: order.id,
    providerChargeId: typeof charge?.id === "string" ? charge.id : null,
    status: mapStatus(order.payment_status ?? charge?.status),
    reference: method?.reference ?? method?.clabe ?? method?.receiving_account_number ?? null,
    nextActionUrl: order.next_action?.redirect_to_url?.url ?? null,
    expiresAt: typeof method?.expires_at === "number" ? new Date(method.expires_at * 1000) : null,
    failureReason: charge?.failure_message ?? charge?.failure_code ?? null,
    ...(card === undefined ? {} : { card }),
  };
}

function mapStatus(value: unknown): ChargeStatus {
  switch (value) {
    case "paid":
      return "paid";
    case "pending":
    case "pending_payment":
      return "pending";
    case "declined":
      return "declined";
    case "expired":
    case "canceled":
    case "voided":
      return "expired";
    default:
      throw new PaymentProviderRejection("Malformed response from the payment provider");
  }
}

function mapCard(method: ConektaPaymentMethod | undefined): CardDetails | undefined {
  if (method === undefined) return undefined;

  const expMonth = Number(method.exp_month);
  const expYear = Number(method.exp_year);

  if (
    typeof method.brand !== "string" ||
    typeof method.last4 !== "string" ||
    !Number.isInteger(expMonth) ||
    !Number.isInteger(expYear)
  ) {
    return undefined;
  }

  return {
    brand: method.brand,
    last4: method.last4,
    expMonth,
    expYear,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorDetail(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;

  const error = body as ConektaError;
  const detail = error.details?.[0];

  return detail?.message ?? error.message ?? detail?.debug_message ?? null;
}

function errorCode(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;

  return (body as ConektaError).details?.[0]?.code ?? null;
}

function isDeclineCode(code: string | null): boolean {
  return code?.startsWith("conekta.errors.processing.bank.") === true;
}
