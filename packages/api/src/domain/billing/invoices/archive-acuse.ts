import { acuseMatchesInvoice } from "@aqui-suena/api/domain/billing/invoices/acuse";
import type { CfdiDocumentStore } from "@aqui-suena/api/domain/billing/invoices/invoice";

export type AcuseArchive = {
  /** Set only when the document really proves this cancellation. */
  readonly key: string | null;
  /** A human-readable note for `cancellation_detail` when the proof is unusable. */
  readonly warning: string | null;
};

export type ArchiveAcuseDependencies = {
  readonly documents: CfdiDocumentStore;
  readonly accountId: string;
  readonly invoiceUuid: string | null;
  readonly acuseXml: string | null;
  readonly onArchiveError?: (error: unknown, accountId: string) => void;
};

const MISMATCH = "acuse does not match the invoice";

/**
 * Archives the acuse only when it proves this cancellation.
 *
 * An acuse naming a different UUID is not proof, and filing it under `acuse_key`
 * would let a later download present it as if it were. It is dropped with a
 * warning instead, and the cancellation itself is never failed: it already
 * happened at the SAT.
 */
export async function archiveAcuse(deps: ArchiveAcuseDependencies): Promise<AcuseArchive> {
  if (deps.acuseXml === null) {
    return { key: null, warning: null };
  }

  if (deps.invoiceUuid === null || !acuseMatchesInvoice(deps.acuseXml, deps.invoiceUuid)) {
    return { key: null, warning: MISMATCH };
  }

  try {
    return {
      key: await deps.documents.saveAcuse({ accountId: deps.accountId, xml: deps.acuseXml }),
      warning: null,
    };
  } catch (error) {
    deps.onArchiveError?.(error, deps.accountId);

    return { key: null, warning: null };
  }
}

/** Keeps the provider's message and the warning together, without losing either. */
export function mergeDetail(detail: string | null, warning: string | null): string | null {
  if (warning === null) return detail;
  if (detail === null) return warning;

  return `${detail} (${warning})`;
}
