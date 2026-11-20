import { TemplatePaymentNotifier } from "@aqui-suena/api/domain/billing/payments/template-payment-notifier";
import { createEmailTemplateRenderer } from "@aqui-suena/api/infrastructure/email/email-template-renderer";
import { FakeEmailSender } from "@aqui-suena/api/testing/email";
import { describe, expect, it } from "vitest";

const renderer = createEmailTemplateRenderer({
  appUrl: "https://aquisuena.mx",
  supportEmail: "soporte@aquisuena.mx",
  billingPath: "/cuenta/suscripcion",
  ownerPortalPath: "/panel",
});

function setup() {
  const emailSender = new FakeEmailSender();
  const notifier = new TemplatePaymentNotifier(
    emailSender,
    renderer,
    "https://aquisuena.mx/cuenta/suscripcion",
  );

  return { emailSender, notifier };
}

const receipt = {
  paymentId: "pay_8F2K91XQ",
  planName: "Oficios & Servicios",
  billingPeriod: "monthly" as const,
  amountMinorUnits: 4900,
  currency: "MXN",
  method: "card" as const,
  paidAt: new Date("2026-03-01T12:00:00Z"),
};

describe("TemplatePaymentNotifier", () => {
  it("sends the receipt with plan, amount, period and date", async () => {
    const { emailSender, notifier } = setup();

    await notifier.paymentReceipt({ email: "owner@example.com", locale: "es-MX" }, receipt);

    expect(emailSender.sent[0]).toMatchObject({
      to: "owner@example.com",
      subject: "Tu recibo de pago — Aquí Suena",
    });
    expect(emailSender.sent[0]?.html).toContain("Oficios &amp; Servicios");
    expect(emailSender.sent[0]?.html).toContain("$49.00 MXN");
    expect(emailSender.sent[0]?.html).toContain("Tarjeta");
    expect(emailSender.sent[0]?.html).toContain("1 de marzo de 2026");
    expect(emailSender.sent[0]?.html).toContain("pay_8F2K91XQ");
    expect(emailSender.sent[0]?.html).toContain("Mensual");
  });

  it("localizes the billing period and date for English", async () => {
    const { emailSender, notifier } = setup();

    await notifier.paymentReceipt({ email: "owner@example.com", locale: "en" }, receipt);

    expect(emailSender.sent[0]?.html).toContain("Monthly");
    expect(emailSender.sent[0]?.html).toContain("March 1, 2026");
    expect(emailSender.sent[0]?.html).toContain('<html lang="en">');
  });

  it("uses the annual label for annual billing", async () => {
    const { emailSender, notifier } = setup();

    await notifier.paymentReceipt(
      { email: "owner@example.com", locale: "es-MX" },
      { ...receipt, billingPeriod: "annual" },
    );

    expect(emailSender.sent[0]?.html).toContain("Anual");
  });

  it("sends the pending instructions with the reference and expiry", async () => {
    const { emailSender, notifier } = setup();

    await notifier.paymentPending(
      { email: "owner@example.com", locale: "es-MX" },
      {
        paymentId: "pay-1",
        planName: "Oficios & Servicios",
        method: "cash",
        amountMinorUnits: 9900,
        currency: "MXN",
        reference: "1234567890",
        expiresAt: new Date("2026-11-26T12:00:00Z"),
        nextActionUrl: null,
      },
    );

    expect(emailSender.sent[0]).toMatchObject({
      to: "owner@example.com",
      subject: "Completa tu pago — Aquí Suena",
    });
    expect(emailSender.sent[0]?.html).toContain("Efectivo");
    expect(emailSender.sent[0]?.html).toContain("1234567890");
    expect(emailSender.sent[0]?.html).toContain("$99.00 MXN");
    expect(emailSender.sent[0]?.html).toContain('href="https://aquisuena.mx/cuenta/suscripcion"');
  });

  it("uses the 3DS URL as the pending CTA", async () => {
    const { emailSender, notifier } = setup();

    await notifier.paymentPending(
      { email: "owner@example.com", locale: "en" },
      {
        paymentId: "pay-1",
        planName: "Oficios & Servicios",
        method: "card",
        amountMinorUnits: 9900,
        currency: "MXN",
        reference: null,
        expiresAt: null,
        nextActionUrl: "https://3ds.conekta.com/session/1",
      },
    );

    expect(emailSender.sent[0]?.html).toContain('<html lang="en">');
    expect(emailSender.sent[0]?.html).toContain("Card");
    expect(emailSender.sent[0]?.html).toContain('href="https://3ds.conekta.com/session/1"');
  });
});
