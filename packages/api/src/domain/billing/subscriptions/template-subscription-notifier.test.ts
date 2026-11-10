import { TemplateSubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/template-subscription-notifier";
import { FakeEmailSender } from "@aqui-suena/api/domain/email/email";
import { createEmailTemplateRenderer } from "@aqui-suena/api/infrastructure/email/email-template-renderer";
import { describe, expect, it } from "vitest";

const renderer = createEmailTemplateRenderer({
  appUrl: "https://aquisuena.mx",
  supportEmail: "soporte@aquisuena.mx",
});

function setup() {
  const emailSender = new FakeEmailSender();
  const notifier = new TemplateSubscriptionNotifier(emailSender, renderer);

  return { emailSender, notifier };
}

describe("TemplateSubscriptionNotifier", () => {
  it("sends the downgrade template with the plan name", async () => {
    const { emailSender, notifier } = setup();

    await notifier.planDowngraded(
      { email: "owner@example.com", locale: "es-MX" },
      { planName: "Oficios & Servicios" },
    );

    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]).toMatchObject({
      to: "owner@example.com",
      subject: "Tu plan ha sido degradado",
    });
    expect(emailSender.sent[0]?.html).toContain("Oficios &amp; Servicios");
  });

  it("formats the grace deadline for the recipient locale", async () => {
    const { emailSender, notifier } = setup();

    await notifier.renewalFailed(
      { email: "owner@example.com", locale: "es-MX" },
      { graceEnd: new Date("2026-02-08T12:00:00Z") },
    );

    expect(emailSender.sent[0]?.subject).toContain("periodo de gracia");
    expect(emailSender.sent[0]?.html).toContain("8 de febrero de 2026");
  });

  it("uses the English copy for an English recipient", async () => {
    const { emailSender, notifier } = setup();

    await notifier.graceExpired(
      { email: "owner@example.com", locale: "en" },
      { planName: "Trades & Services" },
    );

    expect(emailSender.sent[0]?.subject).toBe("Your plan has been downgraded");
    expect(emailSender.sent[0]?.html).toContain('<html lang="en">');
  });

  it("sends the cancellation template with the active-until date", async () => {
    const { emailSender, notifier } = setup();

    await notifier.cancelled(
      { email: "owner@example.com", locale: "es-MX" },
      { planName: "Oficios & Servicios", activeUntil: new Date("2026-03-31T12:00:00Z") },
    );

    expect(emailSender.sent[0]?.subject).toBe("Tu cancelación ha sido confirmada");
    expect(emailSender.sent[0]?.html).toContain("31 de marzo de 2026");
  });

  it("sends the 7-day renewal template with the formatted date", async () => {
    const { emailSender, notifier } = setup();

    await notifier.renewalUpcoming(
      { email: "owner@example.com", locale: "es-MX" },
      { daysBefore: 7, renewalDate: new Date("2026-02-08T12:00:00Z") },
    );

    expect(emailSender.sent[0]?.subject).toBe("Tu plan se renueva en 7 días");
    expect(emailSender.sent[0]?.html).toContain("8 de febrero de 2026");
  });

  it("sends the 1-day renewal template", async () => {
    const { emailSender, notifier } = setup();

    await notifier.renewalUpcoming(
      { email: "owner@example.com", locale: "es-MX" },
      { daysBefore: 1, renewalDate: new Date("2026-02-08T12:00:00Z") },
    );

    expect(emailSender.sent[0]?.subject).toBe("Tu plan se renueva mañana");
  });
});
