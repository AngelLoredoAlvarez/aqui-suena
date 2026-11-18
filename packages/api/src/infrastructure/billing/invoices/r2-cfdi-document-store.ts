import type {
  CfdiDocumentLinker,
  CfdiDocumentStore,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import { presignR2ObjectUrl, type R2StorageOptions } from "@aqui-suena/api/infrastructure/r2/sigv4";

/** Five minutes: enough to start a download, short enough to be useless if leaked. */
const DOWNLOAD_EXPIRES_SECONDS = 300;

export type R2CfdiDocumentStoreDependencies = {
  readonly r2: R2StorageOptions;
  readonly fetch: typeof fetch;
};

/** Stores stamped CFDI documents (XML and PDF) in R2. The key layout belongs to this adapter. */
export class R2CfdiDocumentStore implements CfdiDocumentStore, CfdiDocumentLinker {
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

  /**
   * Signs a GET for an archived document. The filename travels inside the
   * signature, so R2 answers a named download and the caller never streams the
   * bytes.
   */
  async signedDownloadUrl(input: {
    key: string;
    fileName: string;
    contentType: string;
  }): Promise<string> {
    return presignR2ObjectUrl(this.deps.r2, "GET", input.key, {
      expiresInSeconds: DOWNLOAD_EXPIRES_SECONDS,
      responseContentDisposition: `attachment; filename="${input.fileName}"`,
      responseContentType: input.contentType,
    });
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
