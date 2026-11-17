import type { CfdiXmlStore } from "@aqui-suena/api/domain/billing/invoices/invoice";
import {
  presignR2ObjectUrl,
  type R2ObjectStorageOptions,
} from "@aqui-suena/api/infrastructure/media/r2-client";

export type R2CfdiXmlStoreDependencies = {
  readonly r2: R2ObjectStorageOptions;
  readonly fetch: typeof fetch;
};

const CONTENT_TYPE = "application/xml";

/** Stores stamped CFDI XML in R2. The key layout belongs to this adapter. */
export class R2CfdiXmlStore implements CfdiXmlStore {
  private readonly deps: R2CfdiXmlStoreDependencies;

  constructor(deps: R2CfdiXmlStoreDependencies) {
    this.deps = deps;
  }

  async save(input: { accountId: string; xml: string }): Promise<string> {
    const key = `cfdi/${input.accountId}/${crypto.randomUUID()}.xml`;

    const url = await presignR2ObjectUrl(this.deps.r2, "PUT", key);
    // Workers rejects native fetch when it is invoked as a method (`obj.fetch()`).
    const fetchFn = this.deps.fetch;

    const response = await fetchFn(url, {
      method: "PUT",
      headers: { "Content-Type": CONTENT_TYPE },
      body: input.xml,
    });

    if (!response.ok) {
      throw new Error(`R2 cfdi upload failed: ${response.status}`);
    }

    return key;
  }
}
