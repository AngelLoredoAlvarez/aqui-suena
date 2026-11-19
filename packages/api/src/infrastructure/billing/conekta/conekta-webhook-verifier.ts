const ALGORITHM = "RSASSA-PKCS1-v1_5";

export async function verifyConektaWebhook(
  rawBody: string,
  digest: string,
  publicKeyPem: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "spki",
      pemBytes(publicKeyPem),
      { name: ALGORITHM, hash: "SHA-256" },
      false,
      ["verify"],
    );

    return await crypto.subtle.verify(
      ALGORITHM,
      key,
      base64Bytes(digest),
      new TextEncoder().encode(rawBody),
    );
  } catch {
    return false;
  }
}

function pemBytes(pem: string): Uint8Array {
  const body = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s+/g, "");

  return base64Bytes(body);
}

function base64Bytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
