import { TemplateAccountNotifier } from "@aqui-suena/api/domain/accounts/template-account-notifier";
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
  const notifier = new TemplateAccountNotifier(emailSender, renderer);

  return { emailSender, notifier };
}

describe("TemplateAccountNotifier", () => {
  it("sends the verification email with the link and expiry", async () => {
    const { emailSender, notifier } = setup();

    await notifier.emailVerificationRequested(
      { email: "owner@example.com", locale: "es-MX" },
      {
        verificationUrl: "https://aquisuena.mx/verificar?token=abc123",
        expiresInHours: 24,
      },
    );

    expect(emailSender.sent[0]).toMatchObject({
      to: "owner@example.com",
      subject: "Verifica tu correo electrónico",
    });
    expect(emailSender.sent[0]?.html).toContain("https://aquisuena.mx/verificar?token=abc123");
    expect(emailSender.sent[0]?.html).toContain("24 horas");
  });

  it("localizes the verification expiry", async () => {
    const { emailSender, notifier } = setup();

    await notifier.emailVerificationRequested(
      { email: "owner@example.com", locale: "en" },
      {
        verificationUrl: "https://aquisuena.mx/verificar?token=abc123",
        expiresInHours: 24,
      },
    );

    expect(emailSender.sent[0]?.html).toContain("24 hours");
    expect(emailSender.sent[0]?.html).toContain('<html lang="en">');
  });

  it("sends the welcome email with the business and recommended plan", async () => {
    const { emailSender, notifier } = setup();

    await notifier.welcome(
      { email: "owner@example.com", locale: "es-MX" },
      {
        businessName: "Panadería La Espiga",
        recommendedPlanName: "Comercios & Catálogo",
      },
    );

    expect(emailSender.sent[0]?.subject).toBe("Bienvenido a Aquí Suena");
    expect(emailSender.sent[0]?.html).toContain("Panadería La Espiga");
    expect(emailSender.sent[0]?.html).toContain("Comercios &amp; Catálogo");
    expect(emailSender.sent[0]?.html).toContain("https://aquisuena.mx/panel");
  });
});
