import { acuseMatchesInvoice } from "@aqui-suena/api/domain/billing/invoices/model/acuse";
import { describe, expect, it } from "vitest";

const UUID = "a9a97ec9-43e3-4535-b0be-dd5204f31d49";

function acuse(uuid: string): string {
  return `<?xml version="1.0" encoding="utf-8" ?><Acuse Fecha="2026-11-18T23:12:29" RfcEmisor="EKU9003173C9"><Folios xmlns="http://cancelacfd.sat.gob.mx"><UUID>${uuid}</UUID><EstatusUUID>201</EstatusUUID></Folios></Acuse>`;
}

describe("acuseMatchesInvoice", () => {
  it("accepts an acuse that names the invoice UUID", () => {
    expect(acuseMatchesInvoice(acuse(UUID), UUID)).toBe(true);
  });

  it("compares case-insensitively, because the SAT and the PAC disagree on casing", () => {
    expect(acuseMatchesInvoice(acuse(UUID.toUpperCase()), UUID.toLowerCase())).toBe(true);
  });

  it("rejects the canned sandbox acuse", () => {
    expect(acuseMatchesInvoice(acuse("0088B8E0-00DE-43D7-A590-8328B803839F"), UUID)).toBe(false);
  });

  it("rejects a document that is not an acuse at all", () => {
    expect(acuseMatchesInvoice("<cfdi:Comprobante/>", UUID)).toBe(false);
    expect(acuseMatchesInvoice("", UUID)).toBe(false);
  });

  it("accepts an acuse that carries several folios when ours is among them", () => {
    const multi = `<Acuse><Folios><UUID>00000000-0000-0000-0000-000000000000</UUID><UUID>${UUID}</UUID></Folios></Acuse>`;

    expect(acuseMatchesInvoice(multi, UUID)).toBe(true);
  });
});
