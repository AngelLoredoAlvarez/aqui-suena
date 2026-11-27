import type { R2StorageOptions } from "@aqui-suena/api/infrastructure/r2/sigv4";

const DEFAULT_IVA_RATE = 0.16;
// SAT: 01010101 = no match in the catalog; replace with the real service code.
const DEFAULT_PRODUCT_CODE = "01010101";
// SAT: E48 = unit of service.
const DEFAULT_UNIT_CODE = "E48";
const DEFAULT_BUCKET = "aqui-suena-media";

export type FacturamaEnv = {
  readonly user?: string;
  readonly password?: string;
  readonly baseUrl?: string;
  readonly mode?: "web" | "multiemisor";
  readonly expeditionPlace?: string;
  readonly ivaRate?: number;
  readonly productCode?: string;
  readonly unitCode?: string;
  readonly series?: string;
  readonly issuerRfc?: string;
  readonly issuerName?: string;
  readonly issuerFiscalRegime?: string;
};

export type R2Env = {
  readonly accountId?: string;
  readonly accessKeyId?: string;
  readonly secretAccessKey?: string;
  readonly bucketName?: string;
  readonly endpoint?: string;
};

type FacturamaSettings = {
  readonly credentials: { user: string; password: string; baseUrl: string };
  readonly fiscal: {
    mode: "web" | "multiemisor";
    expeditionPlace: string;
    ivaRate: number;
    productCode: string;
    unitCode: string;
    series?: string;
    issuer?: { rfc: string; name: string; fiscalRegime: string };
  };
};

/**
 * Validates the PAC settings once and returns them in the shape both adapters
 * take, or `undefined` when the deployment cannot invoice at all.
 */
export function facturamaSettings(facturama: FacturamaEnv): FacturamaSettings | undefined {
  if (!facturama.user || !facturama.password || !facturama.baseUrl || !facturama.expeditionPlace) {
    return undefined;
  }

  const ivaRate = facturama.ivaRate ?? DEFAULT_IVA_RATE;

  if (!(ivaRate > 0 && ivaRate < 1)) {
    return undefined;
  }

  const mode = facturama.mode ?? "web";

  if (
    mode === "multiemisor" &&
    (!facturama.issuerRfc || !facturama.issuerName || !facturama.issuerFiscalRegime)
  ) {
    return undefined;
  }

  return {
    credentials: {
      user: facturama.user,
      password: facturama.password,
      baseUrl: facturama.baseUrl,
    },
    fiscal: {
      mode,
      expeditionPlace: facturama.expeditionPlace,
      ivaRate,
      productCode: facturama.productCode ?? DEFAULT_PRODUCT_CODE,
      unitCode: facturama.unitCode ?? DEFAULT_UNIT_CODE,
      series: facturama.series,
      issuer:
        facturama.issuerRfc && facturama.issuerName && facturama.issuerFiscalRegime
          ? {
              rfc: facturama.issuerRfc,
              name: facturama.issuerName,
              fiscalRegime: facturama.issuerFiscalRegime,
            }
          : undefined,
    },
  };
}

/**
 * Maps an `R2Env` to the storage options the document store takes, or
 * `undefined` when R2 is not configured. Every CFDI factory shares this guard:
 * without it there is no fiscal archive.
 */
export function r2StorageOptions(r2: R2Env): R2StorageOptions | undefined {
  if (!r2.accountId || !r2.accessKeyId || !r2.secretAccessKey) {
    return undefined;
  }

  return {
    accountId: r2.accountId,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    bucketName: r2.bucketName ?? DEFAULT_BUCKET,
    endpoint: r2.endpoint,
  };
}

export function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
