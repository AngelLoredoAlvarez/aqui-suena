/**
 * Does this acuse belong to the invoice we cancelled?
 *
 * The acuse is archive proof: it carries the UUID the SAT cancelled. Storing one
 * that names a different UUID would file a document that proves nothing — and a
 * later download would present it as if it did. The sandbox returns a canned acuse
 * with someone else's UUID, which is exactly how a silent mismatch would ship.
 */
export function acuseMatchesInvoice(xml: string, uuid: string): boolean {
  if (!/<Acuse[\s>]/.test(xml)) return false;

  const uuids = [...xml.matchAll(/<UUID>([^<]+)<\/UUID>/gi)].map((match) =>
    match[1]?.trim().toUpperCase(),
  );

  return uuids.includes(uuid.trim().toUpperCase());
}
