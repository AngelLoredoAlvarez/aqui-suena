import type {
  ArchiveAttemptUpdate,
  CancellationOutcomeUpdate,
  CfdiCancellationMotive,
  CfdiInvoice,
  CfdiInvoiceRepository,
  CfdiInvoiceStatus,
  ListInvoicesInput,
  NewCfdiInvoice,
} from "@aqui-suena/api/domain/billing/invoices/model/invoice";
import { type OffsetPage, paginateOffset } from "@aqui-suena/api/shared/pagination/page";

const ARCHIVABLE_STATUSES = new Set<CfdiInvoiceStatus>([
  "issued",
  "cancelled",
  "cancellation_rejected",
]);

export class InMemoryCfdiInvoiceRepository implements CfdiInvoiceRepository {
  constructor(readonly rows: CfdiInvoice[] = []) {}

  async listByAccount(input: ListInvoicesInput): Promise<OffsetPage<CfdiInvoice>> {
    const listed = this.rows
      .filter((row) => row.accountId === input.accountId && row.status !== "failed")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return paginateOffset(
      listed.slice(input.offset, input.offset + input.limit),
      input.limit,
      input.offset,
    );
  }

  async getByIdForAccount(accountId: string, id: string): Promise<CfdiInvoice | null> {
    return this.rows.find((row) => row.id === id && row.accountId === accountId) ?? null;
  }

  /** Compare-and-set: the winner is the only caller that reaches the provider. */
  async markCancellationRequested(input: {
    id: string;
    accountId: string;
    motive: CfdiCancellationMotive;
    requestedAt: Date;
  }): Promise<boolean> {
    const row = this.rows.find(
      (candidate) =>
        candidate.id === input.id &&
        candidate.accountId === input.accountId &&
        candidate.status === "issued",
    );

    if (row === undefined) return false;

    row.status = "cancellation_pending";
    row.cancellationMotive = input.motive;
    row.cancellationRequestedAt = input.requestedAt;
    row.updatedAt = input.requestedAt;

    return true;
  }

  async listPendingCancellations(input: {
    accountId: string;
    limit: number;
  }): Promise<CfdiInvoice[]> {
    return this.rows
      .filter((row) => row.accountId === input.accountId && row.status === "cancellation_pending")
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
      .slice(0, input.limit);
  }

  async listPendingCancellationsForAllAccounts(input: { limit: number }): Promise<CfdiInvoice[]> {
    return this.rows
      .filter((row) => row.status === "cancellation_pending")
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
      .slice(0, input.limit);
  }

  async recordCancellationOutcome(input: CancellationOutcomeUpdate): Promise<void> {
    const row = this.rows.find(
      (candidate) => candidate.id === input.id && candidate.accountId === input.accountId,
    );

    if (row === undefined) return;

    row.status = input.status;
    row.cancellationResolvedAt = input.resolvedAt;
    row.cancellationExpiresAt = input.expiresAt;
    row.cancellationDetail = input.detail;
    row.acuseKey = input.acuseKey;
    row.updatedAt = input.updatedAt;
  }

  async recordSubstitutionUuid(input: {
    id: string;
    accountId: string;
    substitutionUuid: string;
    updatedAt: Date;
  }): Promise<void> {
    const row = this.rows.find(
      (candidate) => candidate.id === input.id && candidate.accountId === input.accountId,
    );

    if (row === undefined) return;

    row.substitutionUuid = input.substitutionUuid;
    row.updatedAt = input.updatedAt;
  }

  async listMissingArchivesForAllAccounts(input: { limit: number }): Promise<CfdiInvoice[]> {
    return this.rows
      .filter(
        (row) =>
          ARCHIVABLE_STATUSES.has(row.status) &&
          row.providerId !== null &&
          (row.xmlKey === null || row.pdfKey === null),
      )
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime() || a.id.localeCompare(b.id))
      .slice(0, input.limit);
  }

  async recordArchiveAttempt(input: ArchiveAttemptUpdate): Promise<void> {
    const row = this.rows.find(
      (candidate) => candidate.id === input.id && candidate.accountId === input.accountId,
    );

    if (row === undefined) return;

    row.xmlKey = input.xmlKey ?? row.xmlKey;
    row.pdfKey = input.pdfKey ?? row.pdfKey;
    row.updatedAt = input.attemptedAt;
  }

  async create(input: NewCfdiInvoice): Promise<CfdiInvoice> {
    const now = new Date();

    const invoice: CfdiInvoice = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.rows.push(invoice);

    return invoice;
  }
}
