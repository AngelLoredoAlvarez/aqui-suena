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
  const notifier = new TemplatePaymentNotifier(emailSender, renderer);

  return { emailSender, notifier };
}

const receipt = {
  paymentId: "pay_8F2K91XQ",
  planName: "Oficios & Servicios",
  billingPeriod: "monthly" as const,
  amountMinorUnits: 4900,
  currency: "MXN",
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
});
