import type { CfdiInvoiceNotification } from "@aqui-suena/api/domain/billing/invoices/cfdi-notifier";
import { TemplateCfdiNotifier } from "@aqui-suena/api/domain/billing/invoices/template-cfdi-notifier";
import { createEmailTemplateRenderer } from "@aqui-suena/api/infrastructure/email/email-template-renderer";
import { FakeEmailSender } from "@aqui-suena/api/testing/email";
import { describe, expect, it } from "vitest";

const renderer = createEmailTemplateRenderer({
  appUrl: "https://aquisuena.mx",
  supportEmail: "soporte@aquisuena.mx",
  billingPath: "/cuenta/suscripcion",
  ownerPortalPath: "/panel",
});

const UUID = "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B";

/** Mirrors how a mail client decodes an attachment back to text. */
function decode(content: string): string {
  const binary = atob(content);

  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function invoice(overrides: Partial<CfdiInvoiceNotification> = {}): CfdiInvoiceNotification {
  return {
    invoiceId: "inv-1",
    uuid: UUID,
    planName: "Comercios & Catálogo",
    amountMinorUnits: 9900,
    currency: "MXN",
    issuedAt: new Date("2026-11-16T18:00:00Z"),
    downloadUrl: "https://aquisuena.mx/cuenta/suscripcion",
    xml: '<cfdi:Comprobante Folio="A-1"/>',
    pdf: new TextEncoder().encode("%PDF-1.4"),
    ...overrides,
  };
}

function setup() {
  const emailSender = new FakeEmailSender();

  return {
    emailSender,
    notifier: new TemplateCfdiNotifier(emailSender, renderer),
  };
}

describe("TemplateCfdiNotifier", () => {
  it("sends the CFDI with the PDF and the XML attached", async () => {
    const { emailSender, notifier } = setup();

    await notifier.invoiceIssued({ email: "owner@example.com", locale: "es-MX" }, invoice());

    const sent = emailSender.sent[0];

    expect(sent).toMatchObject({
      to: "owner@example.com",
      subject: "Tu factura fiscal (CFDI) está lista",
    });
    expect(sent?.html).toContain("Comercios &amp; Catálogo");
    expect(sent?.html).toContain("$99.00 MXN");
    expect(sent?.html).toContain("16 de noviembre de 2026");
    expect(sent?.html).toContain("inv-1");
    expect(sent?.html).toContain('href="https://aquisuena.mx/cuenta/suscripcion"');
    expect(sent?.attachments).toHaveLength(2);
    expect(sent?.attachments?.[0]).toMatchObject({
      filename: `CFDI-${UUID}.pdf`,
      contentType: "application/pdf",
    });
    expect(decode(sent?.attachments?.[0]?.content ?? "")).toBe("%PDF-1.4");
    expect(sent?.attachments?.[1]).toMatchObject({
      filename: `CFDI-${UUID}.xml`,
      contentType: "application/xml",
    });
    expect(decode(sent?.attachments?.[1]?.content ?? "")).toBe('<cfdi:Comprobante Folio="A-1"/>');
  });

  it("still sends the XML when the PDF could not be downloaded", async () => {
    const { emailSender, notifier } = setup();

    await notifier.invoiceIssued(
      { email: "owner@example.com", locale: "es-MX" },
      invoice({ pdf: undefined }),
    );

    const attachments = emailSender.sent[0]?.attachments ?? [];

    expect(attachments).toHaveLength(1);
    expect(attachments[0]?.filename).toBe(`CFDI-${UUID}.xml`);
  });

  it("keeps accented XML intact through the base64 round trip", async () => {
    const { emailSender, notifier } = setup();
    const xml = '<cfdi:Emisor Nombre="Fundación Núñez"/>';

    await notifier.invoiceIssued({ email: "owner@example.com", locale: "es-MX" }, invoice({ xml }));

    expect(decode(emailSender.sent[0]?.attachments?.[1]?.content ?? "")).toBe(xml);
  });

  it("localizes the subject for English", async () => {
    const { emailSender, notifier } = setup();

    await notifier.invoiceIssued({ email: "owner@example.com", locale: "en" }, invoice());

    expect(emailSender.sent[0]?.html).toContain('<html lang="en">');
    expect(emailSender.sent[0]?.attachments?.[1]?.content).toBeDefined();
  });
});
