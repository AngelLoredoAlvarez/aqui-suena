import {
  R2ObjectStorage,
  type R2ObjectStorageOptions,
} from "@aqui-suena/api/infrastructure/media/r2-object-storage";

export type R2Env = {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;
};

const CREDENTIAL_KEYS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"] as const;
const DEFAULT_BUCKET = "aqui-suena-media";

export function r2OptionsFromEnv(env: R2Env): R2ObjectStorageOptions | null {
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName: env.R2_BUCKET_NAME?.trim() || DEFAULT_BUCKET,
    endpoint: env.R2_ENDPOINT?.trim() || undefined,
  };
}

/** True when some R2 credential is present but the trio is incomplete. */
export function hasPartialR2Config(env: R2Env): boolean {
  const present = CREDENTIAL_KEYS.filter((key) => {
    const value = env[key];

    return value !== undefined && value.trim().length > 0;
  }).length;

  return present > 0 && present < CREDENTIAL_KEYS.length;
}

export function createR2StorageFromEnv(env: R2Env): R2ObjectStorage | undefined {
  const options = r2OptionsFromEnv(env);

  return options === null ? undefined : new R2ObjectStorage(options);
}
