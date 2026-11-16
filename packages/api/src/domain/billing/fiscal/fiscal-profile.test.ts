import {
  CFDI_USES,
  fiscalProfileSchema,
  parseFiscalProfile,
  parseStoredFiscalProfile,
  TAX_REGIMES,
} from "@aqui-suena/api/domain/billing/fiscal/fiscal-profile";
import { DataIntegrityError, ValidationError } from "@aqui-suena/api/shared/domain-error";
import * as v from "valibot";
import { describe, expect, it } from "vitest";

const valid = {
  rfc: "EKU9003173C9",
  legalName: "escuela kemper urgarte",
  taxRegime: "601",
  taxZipCode: "42501",
  cfdiUse: "G03",
  billingEmail: "Facturas@Example.com",
};

function parse(input: Record<string, unknown>) {
  return v.parse(fiscalProfileSchema, input);
}

describe("fiscalProfileSchema", () => {
  it("normalizes the RFC, the legal name and the billing email", () => {
    const profile = parse(valid);

    expect(profile.rfc).toBe("EKU9003173C9");
    expect(profile.legalName).toBe("ESCUELA KEMPER URGARTE");
    expect(profile.billingEmail).toBe("facturas@example.com");
  });

  it("collapses repeated spaces in the legal name", () => {
    expect(parse({ ...valid, legalName: "  distribuidora   del   norte " }).legalName).toBe(
      "DISTRIBUIDORA DEL NORTE",
    );
  });

  it("accepts a 13-character persona física RFC", () => {
    expect(parse({ ...valid, rfc: "aalg880101hdf" }).rfc).toBe("AALG880101HDF");
  });

  it("rejects an RFC with the wrong length", () => {
    expect(() => parse({ ...valid, rfc: "EKU9003173" })).toThrow();
  });

  it("rejects an RFC with a non-existent calendar date", () => {
    expect(() => parse({ ...valid, rfc: "EKU9913323C9" })).toThrow();
  });

  it("rejects an RFC with invalid characters", () => {
    expect(() => parse({ ...valid, rfc: "EKU9003173C!" })).toThrow();
  });

  it("rejects a legal name that still carries a régimen societario", () => {
    expect(() => parse({ ...valid, legalName: "ACME S.A. DE C.V." })).toThrow();
  });

  it("rejects an unknown régimen fiscal", () => {
    expect(() => parse({ ...valid, taxRegime: "999" })).toThrow();
  });

  it("rejects an unknown CFDI use", () => {
    expect(() => parse({ ...valid, cfdiUse: "X99" })).toThrow();
  });

  it("rejects a zip code that is not five digits", () => {
    expect(() => parse({ ...valid, taxZipCode: "4250" })).toThrow();
  });

  it("rejects an invalid billing email", () => {
    expect(() => parse({ ...valid, billingEmail: "not-an-email" })).toThrow();
  });

  it("exposes the SAT catalog keys the UI needs", () => {
    expect(TAX_REGIMES).toContain("601");
    expect(TAX_REGIMES).toContain("626");
    expect(CFDI_USES).toContain("G03");
    expect(CFDI_USES).toContain("CP01");
  });
});

describe("parseFiscalProfile", () => {
  it("throws ValidationError with the offending field", () => {
    const error = (() => {
      try {
        parseFiscalProfile({ ...valid, taxZipCode: "x" });
        return null;
      } catch (caught) {
        return caught;
      }
    })();

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).message).toContain("taxZipCode");
  });
});

describe("parseStoredFiscalProfile", () => {
  it("returns null when the account has no fiscal data", () => {
    expect(
      parseStoredFiscalProfile({
        rfc: null,
        legal_name: null,
        tax_regime: null,
        tax_zip_code: null,
        cfdi_use: null,
        billing_email: null,
      }),
    ).toBeNull();
  });

  it("maps a stored row", () => {
    const profile = parseStoredFiscalProfile({
      rfc: "EKU9003173C9",
      legal_name: "ESCUELA KEMPER URGARTE",
      tax_regime: "601",
      tax_zip_code: "42501",
      cfdi_use: "G03",
      billing_email: "facturas@example.com",
    });

    expect(profile?.rfc).toBe("EKU9003173C9");
    expect(profile?.taxRegime).toBe("601");
  });

  it("raises DataIntegrityError for a stored régime outside the catalog", () => {
    expect(() =>
      parseStoredFiscalProfile({
        rfc: "EKU9003173C9",
        legal_name: "ESCUELA KEMPER URGARTE",
        tax_regime: "999",
        tax_zip_code: "42501",
        cfdi_use: "G03",
        billing_email: "facturas@example.com",
      }),
    ).toThrow(DataIntegrityError);
  });

  it("raises DataIntegrityError for a stored CFDI use outside the catalog", () => {
    expect(() =>
      parseStoredFiscalProfile({
        rfc: "EKU9003173C9",
        legal_name: "ESCUELA KEMPER URGARTE",
        tax_regime: "601",
        tax_zip_code: "42501",
        cfdi_use: "X99",
        billing_email: "facturas@example.com",
      }),
    ).toThrow(DataIntegrityError);
  });
});
