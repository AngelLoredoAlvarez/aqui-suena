import type { CfdiDocumentStore } from "@aqui-suena/api/domain/billing/invoices/invoice";
import { presignR2ObjectUrl, type R2StorageOptions } from "@aqui-suena/api/infrastructure/r2/sigv4";

export type R2CfdiDocumentStoreDependencies = {
  readonly r2: R2StorageOptions;
  readonly fetch: typeof fetch;
};

/** Stores stamped CFDI documents (XML and PDF) in R2. The key layout belongs to this adapter. */
export class R2CfdiDocumentStore implements CfdiDocumentStore {
  private readonly deps: R2CfdiDocumentStoreDependencies;

  constructor(deps: R2CfdiDocumentStoreDependencies) {
    this.deps = deps;
  }

  async saveXml(input: { accountId: string; xml: string }): Promise<string> {
    return this.put(
      `cfdi/${input.accountId}/${crypto.randomUUID()}.xml`,
      input.xml,
      "application/xml",
    );
  }

  async savePdf(input: { accountId: string; pdf: Uint8Array }): Promise<string> {
    return this.put(
      `cfdi/${input.accountId}/${crypto.randomUUID()}.pdf`,
      input.pdf,
      "application/pdf",
    );
  }

  private async put(key: string, body: string | Uint8Array, contentType: string): Promise<string> {
    const url = await presignR2ObjectUrl(this.deps.r2, "PUT", key);
    // Workers rejects native fetch when it is invoked as a method (`obj.fetch()`).
    const fetchFn = this.deps.fetch;

    const response = await fetchFn(url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body,
    });

    if (!response.ok) {
      throw new Error(`R2 cfdi upload failed: ${response.status}`);
    }

    return key;
  }
}
