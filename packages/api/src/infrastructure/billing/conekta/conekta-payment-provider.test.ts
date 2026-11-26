import type { CreateChargeInput } from "@aqui-suena/api/domain/billing/payments/ports/payment-provider";
import { PaymentProviderRejection } from "@aqui-suena/api/domain/billing/payments/ports/payment-provider";
import { ConektaPaymentProvider } from "@aqui-suena/api/infrastructure/billing/conekta/conekta-payment-provider";
import { describe, expect, it } from "vitest";

type FetchCall = {
  readonly url: string;
  readonly init: RequestInit;
};

const customer = {
  name: "Ana Pérez",
  email: "ana@example.com",
  phone: "+5215555555555",
};

function baseInput(overrides: Partial<CreateChargeInput> = {}): CreateChargeInput {
  return {
    paymentId: "pay-1",
    accountId: "acc-1",
    amount: 9900,
    currency: "MXN",
    method: "card",
    billingInterval: "monthly",
    description: "Oficios & Servicios",
    customer,
    cardToken: "tok-1",
    idempotencyKey: "idem-1",
    ...overrides,
  };
}

function setup(responseBody: unknown, status = 200) {
  const calls: FetchCall[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });

    return new Response(JSON.stringify(responseBody), { status });
  };
  const provider = new ConektaPaymentProvider({
    apiKey: "key_test",
    fetch: fakeFetch,
  });

  return { calls, provider };
}

function bodyOf(call: FetchCall | undefined): Record<string, unknown> {
  return JSON.parse(String(call?.init.body)) as Record<string, unknown>;
}

describe("ConektaPaymentProvider.createCharge", () => {
  it("creates a card order, sends the token and maps the paid charge", async () => {
    const { calls, provider } = setup({
      id: "ord_1",
      payment_status: "paid",
      charges: {
        data: [
          {
            id: "chg_1",
            status: "paid",
            payment_method: {
              brand: "visa",
              last4: "4242",
              exp_month: "12",
              exp_year: "30",
            },
          },
        ],
      },
    });

    const result = await provider.createCharge(
      baseInput({ returnUrl: "https://app.example/checkout/return" }),
    );

    expect(result).toMatchObject({
      providerOrderId: "ord_1",
      providerChargeId: "chg_1",
      status: "paid",
      card: { brand: "visa", last4: "4242", expMonth: 12, expYear: 30 },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.conekta.io/orders");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.headers).toMatchObject({
      Authorization: "Bearer key_test",
      Accept: "application/vnd.conekta-v2.3.0+json",
      "Content-Type": "application/json",
      "Idempotency-Key": "idem-1",
    });
    expect(bodyOf(calls[0])).toMatchObject({
      currency: "MXN",
      customer_info: customer,
      line_items: [{ name: "Oficios & Servicios", unit_price: 9900, quantity: 1 }],
      charges: [{ payment_method: { type: "card", token_id: "tok-1" } }],
      metadata: { payment_id: "pay-1" },
      three_ds_mode: "smart",
      return_url: "https://app.example/checkout/return",
    });
  });

  it("creates a cash order with its expiry and maps the reference", async () => {
    const { calls, provider } = setup({
      id: "ord_2",
      payment_status: "pending_payment",
      charges: {
        data: [
          {
            id: "chg_2",
            status: "pending_payment",
            payment_method: {
              type: "cash",
              reference: "1234567890",
              expires_at: 1795000000,
            },
          },
        ],
      },
    });
    const expiresAt = new Date("2026-11-26T12:00:00Z");

    const result = await provider.createCharge(
      baseInput({ method: "cash", cardToken: undefined, expiresAt }),
    );

    expect(result).toMatchObject({
      status: "pending",
      reference: "1234567890",
      expiresAt: new Date(1795000000 * 1000),
    });
    expect(bodyOf(calls[0])).toMatchObject({
      charges: [
        {
          payment_method: {
            type: "cash",
            expires_at: Math.floor(expiresAt.getTime() / 1000),
          },
        },
      ],
    });
    expect(bodyOf(calls[0])).not.toHaveProperty("three_ds_mode");
  });

  it("creates a SPEI order and maps the CLABE as the reference", async () => {
    const { calls, provider } = setup({
      id: "ord_3",
      payment_status: "pending_payment",
      charges: {
        data: [
          {
            id: "chg_3",
            status: "pending_payment",
            payment_method: {
              type: "spei",
              clabe: "012345678901234567",
            },
          },
        ],
      },
    });

    const result = await provider.createCharge(baseInput({ method: "spei", cardToken: undefined }));

    expect(result).toMatchObject({ status: "pending", reference: "012345678901234567" });
    expect(bodyOf(calls[0])).toMatchObject({
      charges: [{ payment_method: { type: "spei" } }],
    });
  });

  it("charges a saved card through the customer id and payment source", async () => {
    const { calls, provider } = setup({
      id: "ord_4",
      payment_status: "paid",
      charges: { data: [{ id: "chg_4", status: "paid", payment_method: {} }] },
    });

    await provider.createCharge(
      baseInput({
        cardToken: undefined,
        savedCard: { customerId: "cus_1", sourceId: "src_1" },
      }),
    );

    expect(bodyOf(calls[0])).toMatchObject({
      customer_info: { customer_id: "cus_1" },
      charges: [{ payment_method: { type: "card", payment_source_id: "src_1" } }],
    });
  });

  it("maps a 3DS challenge URL", async () => {
    const { provider } = setup({
      id: "ord_5",
      payment_status: "pending_payment",
      next_action: {
        redirect_to_url: { url: "https://3ds.conekta.com/session/1" },
      },
      charges: { data: [{ id: "chg_5", status: "pending_payment", payment_method: {} }] },
    });

    const result = await provider.createCharge(
      baseInput({ returnUrl: "https://app.example/return" }),
    );

    expect(result).toMatchObject({
      status: "pending",
      nextActionUrl: "https://3ds.conekta.com/session/1",
    });
  });

  it("maps a declined charge with its failure reason", async () => {
    const { provider } = setup({
      id: "ord_6",
      payment_status: "declined",
      charges: {
        data: [
          {
            id: "chg_6",
            status: "declined",
            failure_message: "insufficient_funds",
            payment_method: {},
          },
        ],
      },
    });

    const result = await provider.createCharge(baseInput());

    expect(result).toMatchObject({
      status: "declined",
      failureReason: "insufficient_funds",
    });
  });

  it.each([
    ["conekta.errors.processing.bank.declined", "Tarjeta declinada. Intenta con otra tarjeta."],
    [
      "conekta.errors.processing.bank.insufficient_funds",
      "La tarjeta tiene fondos insuficientes. Intenta con otra tarjeta.",
    ],
  ])("maps a card 402 %s to a declined charge", async (code, message) => {
    const { provider } = setup({ details: [{ message, code }] }, 402);

    const result = await provider.createCharge(baseInput());

    expect(result).toMatchObject({
      providerOrderId: null,
      status: "declined",
      failureReason: message,
    });
  });

  it("rejects a card 402 that is not a decline", async () => {
    const { provider } = setup(
      {
        details: [
          {
            message: "La tarjeta no pudo ser procesada.",
            code: "conekta.errors.processing.tokenization.used",
          },
        ],
      },
      402,
    );

    await expect(provider.createCharge(baseInput())).rejects.toBeInstanceOf(
      PaymentProviderRejection,
    );
  });

  it("rejects a card 402 without a decline code", async () => {
    const { provider } = setup(
      { details: [{ message: "La tarjeta no pudo ser procesada." }] },
      402,
    );

    await expect(provider.createCharge(baseInput())).rejects.toBeInstanceOf(
      PaymentProviderRejection,
    );
  });

  it("still rejects a non-card 402 from the provider", async () => {
    const { provider } = setup(
      { details: [{ message: "No se pudo encontrar el proveedor." }] },
      402,
    );

    await expect(
      provider.createCharge(baseInput({ method: "cash", cardToken: undefined })),
    ).rejects.toBeInstanceOf(PaymentProviderRejection);
  });

  it("maps a pending payment without a 3DS URL", async () => {
    const { provider } = setup({
      id: "ord_7",
      payment_status: "pending_payment",
      charges: { data: [{ id: "chg_7", status: "pending_payment", payment_method: {} }] },
    });

    const result = await provider.createCharge(baseInput({ method: "cash", cardToken: undefined }));

    expect(result.status).toBe("pending");
    expect(result.nextActionUrl).toBeNull();
  });

  it.each(["canceled", "voided"])("maps a %s order to expired", async (status) => {
    const { provider } = setup({
      id: "ord_canceled",
      payment_status: status,
      charges: { data: [{ id: "chg_canceled", status, payment_method: {} }] },
    });

    const result = await provider.getOrder("ord_canceled");

    expect(result.status).toBe("expired");
  });

  it("maps an expired order", async () => {
    const { provider } = setup({
      id: "ord_8",
      payment_status: "expired",
      charges: { data: [{ id: "chg_8", status: "expired", payment_method: {} }] },
    });

    expect((await provider.createCharge(baseInput())).status).toBe("expired");
  });

  it("rejects an unknown payment status", async () => {
    const { provider } = setup({
      id: "ord_9",
      payment_status: "refunded",
      charges: { data: [{ id: "chg_9", status: "refunded", payment_method: {} }] },
    });

    await expect(provider.createCharge(baseInput())).rejects.toBeInstanceOf(
      PaymentProviderRejection,
    );
  });

  it("rejects a malformed success response", async () => {
    const { provider } = setup({ charges: { data: [] } });

    await expect(provider.createCharge(baseInput())).rejects.toBeInstanceOf(
      PaymentProviderRejection,
    );
  });

  it("maps a provider error body to the rejection detail", async () => {
    const { provider } = setup({ details: [{ message: "The card token is invalid" }] }, 400);

    const error = await provider.createCharge(baseInput()).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PaymentProviderRejection);
    expect(error).toMatchObject({ detail: "The card token is invalid" });
  });
});

describe("ConektaPaymentProvider.getOrder", () => {
  it("fetches and maps an order by id", async () => {
    const { calls, provider } = setup({
      id: "ord_10",
      payment_status: "paid",
      charges: { data: [{ id: "chg_10", status: "paid", payment_method: {} }] },
    });

    const result = await provider.getOrder("ord_10");

    expect(result).toMatchObject({ providerOrderId: "ord_10", status: "paid" });
    expect(calls[0]?.url).toBe("https://api.conekta.io/orders/ord_10");
    expect(calls[0]?.init.method).toBe("GET");
    expect(calls[0]?.init.headers).not.toHaveProperty("Idempotency-Key");
  });
});

describe("ConektaPaymentProvider.createCardSource", () => {
  it("creates a customer with a card source", async () => {
    const { calls, provider } = setup({
      id: "cus_1",
      payment_sources: {
        data: [
          {
            id: "src_1",
            type: "card",
            brand: "visa",
            last4: "4242",
            exp_month: "12",
            exp_year: "30",
          },
        ],
      },
    });

    const result = await provider.createCardSource({
      customer,
      token: "tok-1",
      idempotencyKey: "idem-card-1",
    });

    expect(result).toEqual({
      customerId: "cus_1",
      sourceId: "src_1",
      card: { brand: "visa", last4: "4242", expMonth: 12, expYear: 30 },
    });
    expect(calls[0]?.url).toBe("https://api.conekta.io/customers");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.headers).toMatchObject({
      Authorization: "Bearer key_test",
      "Idempotency-Key": "idem-card-1",
    });
    expect(bodyOf(calls[0])).toMatchObject({
      ...customer,
      payment_sources: [{ type: "card", token_id: "tok-1" }],
    });
  });

  it("rejects a malformed customer response", async () => {
    const { provider } = setup({ id: "cus_1", payment_sources: { data: [] } });

    await expect(provider.createCardSource({ customer, token: "tok-1" })).rejects.toBeInstanceOf(
      PaymentProviderRejection,
    );
  });
});

describe("ConektaPaymentProvider.deleteCustomer", () => {
  it("deletes the customer by id", async () => {
    const { calls, provider } = setup({});

    await provider.deleteCustomer("cus_1");

    expect(calls[0]?.url).toBe("https://api.conekta.io/customers/cus_1");
    expect(calls[0]?.init.method).toBe("DELETE");
    expect(calls[0]?.init.headers).toMatchObject({
      Authorization: "Bearer key_test",
      Accept: "application/vnd.conekta-v2.3.0+json",
    });
  });
});
