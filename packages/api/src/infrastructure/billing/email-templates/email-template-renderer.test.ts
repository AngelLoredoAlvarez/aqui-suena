import {
  EMAIL_LOCALES,
  EMAIL_TEMPLATE_IDS,
  type EmailTemplateVars,
} from "@aqui-suena/api/domain/email/email-template";
import { describe, expect, it } from "vitest";

import { createEmailTemplateRenderer } from "./email-template-renderer";

const baseVars: EmailTemplateVars = {
  planName: "Oficios & Servicios",
  graceEnd: "15 de marzo de 2026",
  renewalDate: "15 de marzo de 2026",
  activeUntil: "31 de marzo de 2026",
  paidAt: "1 de marzo de 2026",
  issuedAt: "2 de marzo de 2026",
  amount: "$49.00 MXN",
  period: "Mensual",
  expiresIn: "24 horas",
  paymentId: "pay_8F2K91XQ",
  invoiceId: "A-000123",
  businessName: "Panadería La Espiga",
  recommendedPlan: "Comercios & Catálogo",
  verifyUrl: "https://aquisuena.mx/verificar?token=abc123",
  downloadUrl: "https://aquisuena.mx/cuenta/facturas/A-000123",
};

const renderer = createEmailTemplateRenderer({
  appUrl: "https://aquisuena.mx",
  supportEmail: "soporte@aquisuena.mx",
});

describe("createEmailTemplateRenderer", () => {
  it.each([...EMAIL_TEMPLATE_IDS])("renders %s in every locale", (id) => {
    for (const locale of EMAIL_LOCALES) {
      const email = renderer.render(id, locale, baseVars);

      expect(email.subject.length).toBeGreaterThan(0);
      expect(email.html).toContain(`<html lang="${locale}">`);
    }
  });

  it("renders the downgrade subject in the requested locale", () => {
    expect(renderer.render("downgrade", "es-MX", baseVars).subject).toBe(
      "Tu plan ha sido degradado",
    );
    expect(renderer.render("downgrade", "en", baseVars).subject).toBe(
      "Your plan has been downgraded",
    );
  });

  it("interpolates template variables into the body", () => {
    const email = renderer.render("downgrade", "es-MX", baseVars);

    expect(email.html).toContain("Oficios &amp; Servicios");
  });

  it("derives account links from the configured app url", () => {
    const email = renderer.render("downgrade", "es-MX", baseVars);

    expect(email.html).toContain("https://aquisuena.mx/cuenta/suscripcion");
  });

  it("renders summary rows for receipt templates", () => {
    const email = renderer.render("receipt", "es-MX", baseVars);

    expect(email.html).toContain("$49.00 MXN");
    expect(email.html).toContain("pay_8F2K91XQ");
  });

  it("escapes html in user-provided values", () => {
    const email = renderer.render("welcome", "es-MX", {
      ...baseVars,
      businessName: "A <b>B</b>",
    });

    expect(email.html).toContain("A &lt;b&gt;B&lt;/b&gt;");
    expect(email.html).not.toContain("<b>B</b>");
  });

  it("throws when a required variable is missing", () => {
    expect(() => renderer.render("downgrade", "es-MX", {})).toThrow(
      /missing email template variable/i,
    );
  });
});
