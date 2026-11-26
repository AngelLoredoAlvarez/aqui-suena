import {
  describeError,
  type FacturamaEnv,
  facturamaSettings,
  r2StorageOptions,
} from "@aqui-suena/api/server/composition/invoice/invoice-config";
import { describe, expect, it } from "vitest";

const facturama: FacturamaEnv = {
  user: "facturama-user",
  password: "secret",
  baseUrl: "https://apisandbox.facturama.mx",
  expeditionPlace: "42501",
};

describe("facturamaSettings", () => {
  it("returns undefined without the PAC credentials", () => {
    expect(facturamaSettings({ ...facturama, user: undefined })).toBeUndefined();
    expect(facturamaSettings({ ...facturama, password: undefined })).toBeUndefined();
    expect(facturamaSettings({ ...facturama, baseUrl: undefined })).toBeUndefined();
    expect(facturamaSettings({ ...facturama, expeditionPlace: undefined })).toBeUndefined();
  });

  it("returns undefined when the VAT rate is not a fraction", () => {
    expect(facturamaSettings({ ...facturama, ivaRate: 0 })).toBeUndefined();
    expect(facturamaSettings({ ...facturama, ivaRate: 1 })).toBeUndefined();
    expect(facturamaSettings({ ...facturama, ivaRate: 16 })).toBeUndefined();
  });

  it("returns undefined in multiemisor mode without an issuer", () => {
    expect(facturamaSettings({ ...facturama, mode: "multiemisor" })).toBeUndefined();
  });

  it("applies the configured VAT rate and the default product/unit codes", () => {
    expect(facturamaSettings({ ...facturama, ivaRate: 0.16 })).toMatchObject({
      credentials: {
        user: "facturama-user",
        password: "secret",
        baseUrl: "https://apisandbox.facturama.mx",
      },
      fiscal: {
        mode: "web",
        expeditionPlace: "42501",
        ivaRate: 0.16,
        productCode: "01010101",
        unitCode: "E48",
      },
    });
  });

  it("defaults the VAT rate and includes the issuer in multiemisor mode", () => {
    expect(
      facturamaSettings({
        ...facturama,
        mode: "multiemisor",
        issuerRfc: "EKU9003173C9",
        issuerName: "ESCUELA KEMPER URGATE",
        issuerFiscalRegime: "601",
      }),
    ).toMatchObject({
      fiscal: {
        mode: "multiemisor",
        ivaRate: 0.16,
        issuer: {
          rfc: "EKU9003173C9",
          name: "ESCUELA KEMPER URGATE",
          fiscalRegime: "601",
        },
      },
    });
  });
});

describe("r2StorageOptions", () => {
  it("returns undefined without the R2 credentials", () => {
    expect(r2StorageOptions({ accountId: "acc", accessKeyId: "key" })).toBeUndefined();
    expect(r2StorageOptions({ accountId: "acc", secretAccessKey: "secret" })).toBeUndefined();
    expect(r2StorageOptions({})).toBeUndefined();
  });

  it("passes through the credentials and defaults the bucket", () => {
    expect(
      r2StorageOptions({
        accountId: "acc",
        accessKeyId: "key",
        secretAccessKey: "secret",
        endpoint: "https://example.r2.cloudflarestorage.com",
      }),
    ).toEqual({
      accountId: "acc",
      accessKeyId: "key",
      secretAccessKey: "secret",
      bucketName: "aqui-suena-media",
      endpoint: "https://example.r2.cloudflarestorage.com",
    });
  });
});

describe("describeError", () => {
  it("formats Error instances with name and message", () => {
    expect(describeError(new Error("boom"))).toBe("Error: boom");
  });

  it("stringifies non-Error values", () => {
    expect(describeError("plain")).toBe("plain");
    expect(describeError(42)).toBe("42");
  });
});
