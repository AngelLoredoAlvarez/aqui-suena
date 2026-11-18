/**
 * Shared plumbing for the Facturama adapters: credentials, URL shaping, Basic
 * auth, base64 decoding and the single place that turns an HTTP failure into a
 * provider rejection. Issuing, downloading and cancelling all speak through it,
 * so the dialect lives in one file.
 */

export type FacturamaCredentials = {
  readonly user: string;
  readonly password: string;
  readonly baseUrl: string;
};

export const MALFORMED_RESPONSE = "Malformed response from the invoice provider";

/** Trims trailing slashes so `${baseUrl}/3/cfdis` never doubles a slash. */
export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Facturama v3 authenticates with the panel credentials over Basic. */
export function toBasicAuth(user: string, password: string): string {
  return `Basic ${btoa(`${user}:${password}`)}`;
}

/** Base64 to bytes: `atob` yields a binary string, not a typed array. */
export function decodeBase64Bytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

/** The XML arrives base64-encoded UTF-8; `atob` alone would corrupt accents. */
export function decodeBase64Text(base64: string): string {
  return new TextDecoder().decode(decodeBase64Bytes(base64));
}

/**
 * A rejection carries a JSON `Message`. When the body is not JSON or is empty,
 * the HTTP status is the only useful detail left.
 */
export async function readRejectionDetail(response: Response): Promise<string> {
  const body = await response.text();

  if (body.length > 0) {
    try {
      const parsed: unknown = JSON.parse(body);

      if (typeof parsed === "object" && parsed !== null && "Message" in parsed) {
        const message = (parsed as { Message: unknown }).Message;

        if (typeof message === "string" && message.length > 0) return message;
      }
    } catch {
      return body;
    }
  }

  return `The invoice provider answered ${response.status}`;
}
