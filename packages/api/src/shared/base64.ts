/**
 * Base64-encodes raw bytes. Workers have no `Buffer`, and spreading a large
 * array into `String.fromCharCode` would overflow the call stack on a PDF.
 */
export function toBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
