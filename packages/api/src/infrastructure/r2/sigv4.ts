export interface R2StorageOptions {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  /** Override the R2 S3-compatible endpoint (defaults to https://{accountId}.r2.cloudflarestorage.com). */
  endpoint?: string;
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
 *
 * The signature covers `host` only and declares an unsigned payload, so the
 * caller may stream any body as long as it sends the matching content type.
 */
export async function presignR2ObjectUrl(
  options: R2StorageOptions,
  method: string,
  key: string,
): Promise<string> {
  const endpoint = options.endpoint ?? `https://${options.accountId}.r2.cloudflarestorage.com`;
  const { accessKeyId, secretAccessKey, bucketName } = options;
  const host = new URL(endpoint).host;
  const path = `/${bucketName}/${key}`;
  const { amzDate, dateStamp } = formatAmzDate(new Date());

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

  const canonicalRequest = [
    method,
    path,
    sortedQuery,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const canonicalRequestHash = await sha256Hex(canonicalRequest);

  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, canonicalRequestHash].join(
    "\n",
  );

  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, REGION);
  const kService = await hmacSha256(kRegion, SERVICE);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = bufToHex(await hmacSha256(kSigning, stringToSign));

  return `${endpoint}${path}?${sortedQuery}&X-Amz-Signature=${signature}`;
}
