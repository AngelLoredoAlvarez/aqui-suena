import type {
  ObjectMetadata,
  ObjectStorage,
  PresignUploadInput,
  PresignUploadResult,
} from "@aqui-suena/api/domain/media/storage";
import { validateMediaUpload } from "@aqui-suena/api/domain/media/storage";

export interface R2ObjectStorageOptions {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  /** Override the R2 S3-compatible endpoint (defaults to https://{accountId}.r2.cloudflarestorage.com). */
  endpoint?: string;
  fetchFn?: typeof fetch;
}

const REGION = "auto";
const SERVICE = "s3";
const EXPIRES_SECONDS = 300;

function bufToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return bufToHex(digest);
}

async function hmacSha256(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
  const rawKey = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

function formatAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

/**
 * Builds an AWS Signature V4 presigned URL for the given method/key.
 * Uses Web Crypto (available in Node 18+ and Cloudflare Workers) — no SDK needed.
 */
async function presignUrl(
  method: string,
  key: string,
  options: R2ObjectStorageOptions,
  endpoint: string,
): Promise<string> {
  const { accessKeyId, secretAccessKey, bucketName } = options;
  const host = new URL(endpoint).host;
  const path = `/${bucketName}/${key}`;
  const now = new Date();
  const { amzDate, dateStamp } = formatAmzDate(now);

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(EXPIRES_SECONDS),
    "X-Amz-SignedHeaders": "host",
  };

  const sortedQuery = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k] as string)}`)
    .join("&");

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const payloadHash = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    method,
    path,
    sortedQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const canonicalRequestHash = await sha256Hex(canonicalRequest);

  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, canonicalRequestHash].join(
    "\n",
  );

  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, REGION);
  const kService = await hmacSha256(kRegion, SERVICE);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signatureBuf = await hmacSha256(kSigning, stringToSign);
  const signature = bufToHex(signatureBuf);

  return `${endpoint}${path}?${sortedQuery}&X-Amz-Signature=${signature}`;
}

/**
 * R2 adapter implementing the ObjectStorage port.
 * Uses the S3-compatible HTTP API with SigV4 signing via Web Crypto.
 */
export class R2ObjectStorage implements ObjectStorage {
  private readonly fetchFn: typeof fetch;
  private readonly endpoint: string;

  constructor(private readonly options: R2ObjectStorageOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.endpoint = options.endpoint ?? `https://${options.accountId}.r2.cloudflarestorage.com`;
  }

  async presignUpload(input: PresignUploadInput): Promise<PresignUploadResult> {
    validateMediaUpload(input.kind, input.contentType, input.sizeBytes);

    const key = `${input.kind}/${input.ownerId}/${crypto.randomUUID()}`;
    const uploadUrl = await presignUrl("PUT", key, this.options, this.endpoint);
    return { key, uploadUrl };
  }

  async head(key: string): Promise<ObjectMetadata | null> {
    const url = await presignUrl("GET", key, this.options, this.endpoint);
    const response = await this.fetchFn(url, { method: "GET" });

    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`R2 head failed: ${response.status}`);
    }

    const size = Number(response.headers.get("content-length") ?? "0");
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    return { key, size, contentType };
  }

  async delete(key: string): Promise<void> {
    const url = await presignUrl("DELETE", key, this.options, this.endpoint);
    const response = await this.fetchFn(url, { method: "DELETE" });
    if (!response.ok && response.status !== 204) {
      throw new Error(`R2 delete failed: ${response.status}`);
    }
  }
}
