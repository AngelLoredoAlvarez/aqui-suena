import {
  createR2StorageFromEnv,
  hasPartialR2Config,
} from "@aqui-suena/api/infrastructure/media/r2-from-env";
import type { R2ObjectStorage } from "@aqui-suena/api/infrastructure/media/r2-object-storage";
import type { FacturamaEnv, R2Env } from "@aqui-suena/api/server/composition/invoice/invoices";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";

/**
 * The Worker env and the composition contract name the same settings
 * differently; both mappings live here so a new call site cannot drift.
 */
export function facturamaEnv(env: WorkerEnv): FacturamaEnv {
  return {
    user: env.FACTURAMA_USER,
    password: env.FACTURAMA_PASSWORD,
    baseUrl: env.FACTURAMA_BASE_URL,
    mode: env.FACTURAMA_MODE === "multiemisor" ? "multiemisor" : "web",
    expeditionPlace: env.FACTURAMA_EXPEDITION_PLACE,
    ivaRate: env.FACTURAMA_IVA_RATE ? Number(env.FACTURAMA_IVA_RATE) : undefined,
    productCode: env.FACTURAMA_PRODUCT_CODE,
    unitCode: env.FACTURAMA_UNIT_CODE,
    series: env.FACTURAMA_SERIES,
    issuerRfc: env.FACTURAMA_ISSUER_RFC,
    issuerName: env.FACTURAMA_ISSUER_NAME,
    issuerFiscalRegime: env.FACTURAMA_ISSUER_FISCAL_REGIME,
  };
}

export function r2Env(env: WorkerEnv): R2Env {
  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME,
    endpoint: env.R2_ENDPOINT,
  };
}

export function mediaStorageFromEnv(env: WorkerEnv): R2ObjectStorage | undefined {
  const storage = createR2StorageFromEnv(env);

  if (storage === undefined && hasPartialR2Config(env)) {
    console.error(
      "worker: incomplete R2 configuration; media storage is unconfigured (set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY)",
    );
  }

  return storage;
}
