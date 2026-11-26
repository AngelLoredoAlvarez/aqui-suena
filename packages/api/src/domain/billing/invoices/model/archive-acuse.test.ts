import {
  archiveAcuse,
  mergeDetail,
} from "@aqui-suena/api/domain/billing/invoices/model/archive-acuse";
import type { CfdiDocumentStore } from "@aqui-suena/api/domain/billing/invoices/model/invoice";
import { describe, expect, it, vi } from "vitest";

const UUID = "a9a97ec9-43e3-4535-b0be-dd5204f31d49";
const ACCOUNT = "acc-1";

function acuse(uuid: string): string {
  return `<?xml version="1.0" encoding="utf-8" ?><Acuse Fecha="2026-11-18T23:12:29" RfcEmisor="EKU9003173C9"><Folios xmlns="http://cancelacfd.sat.gob.mx"><UUID>${uuid}</UUID><EstatusUUID>201</EstatusUUID></Folios></Acuse>`;
}

function documents(
  saveAcuse: CfdiDocumentStore["saveAcuse"] = vi.fn(async () => "acuse-key"),
): CfdiDocumentStore {
  return { saveAcuse } as CfdiDocumentStore;
}

describe("archiveAcuse", () => {
  it("returns nothing to archive when there is no acuse", async () => {
    const result = await archiveAcuse({
      documents: documents(),
      accountId: ACCOUNT,
      invoiceUuid: UUID,
      acuseXml: null,
    });

    expect(result).toEqual({ key: null, warning: null });
  });

  it("drops the acuse when the invoice UUID is missing", async () => {
    const result = await archiveAcuse({
      documents: documents(),
      accountId: ACCOUNT,
      invoiceUuid: null,
      acuseXml: acuse(UUID),
    });

    expect(result).toEqual({ key: null, warning: "acuse does not match the invoice" });
  });

  it("drops an acuse that names a different UUID", async () => {
    const result = await archiveAcuse({
      documents: documents(),
      accountId: ACCOUNT,
      invoiceUuid: UUID,
      acuseXml: acuse("00000000-0000-0000-0000-000000000000"),
    });

    expect(result).toEqual({ key: null, warning: "acuse does not match the invoice" });
  });

  it("archives the acuse when it proves the cancellation", async () => {
    const saveAcuse = vi.fn(async () => "acuse-key");
    const xml = acuse(UUID);

    const result = await archiveAcuse({
      documents: documents(saveAcuse),
      accountId: ACCOUNT,
      invoiceUuid: UUID,
      acuseXml: xml,
    });

    expect(saveAcuse).toHaveBeenCalledWith({ accountId: ACCOUNT, xml });
    expect(result).toEqual({ key: "acuse-key", warning: null });
  });

  it("reports an archive failure without failing the cancellation", async () => {
    const onArchiveError = vi.fn();
    const saveAcuse = vi.fn(async () => {
      throw new Error("r2 down");
    });

    const result = await archiveAcuse({
      documents: documents(saveAcuse),
      accountId: ACCOUNT,
      invoiceUuid: UUID,
      acuseXml: acuse(UUID),
      onArchiveError,
    });

    expect(onArchiveError).toHaveBeenCalledWith(expect.any(Error), ACCOUNT);
    expect(result).toEqual({ key: null, warning: null });
  });
});

describe("mergeDetail", () => {
  it("keeps the detail when there is no warning", () => {
    expect(mergeDetail("declined", null)).toBe("declined");
  });

  it("uses the warning when there is no detail", () => {
    expect(mergeDetail(null, "acuse does not match")).toBe("acuse does not match");
  });

  it("joins both without losing either", () => {
    expect(mergeDetail("declined", "acuse does not match")).toBe("declined (acuse does not match)");
  });
});
