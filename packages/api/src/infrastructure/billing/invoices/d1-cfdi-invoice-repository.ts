import type {
  CancellationOutcomeUpdate,
  CfdiCancellationMotive,
  CfdiInvoice,
  CfdiInvoiceRepository,
  CfdiInvoiceStatus,
  ListInvoicesInput,
  NewCfdiInvoice,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import { fromEpoch, toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { type OffsetPage, paginateOffset } from "@aqui-suena/api/shared/pagination/page";

const COLUMNS =
  "id, account_id, payment_id, status, uuid, provider_id, xml_key, pdf_key, failure_reason, " +
  "cancellation_motive, cancellation_requested_at, cancellation_resolved_at, cancellation_expires_at, " +
  "cancellation_detail, acuse_key, substitution_uuid, created_at, updated_at";

type CfdiInvoiceRow = {
  readonly id: string;
  readonly account_id: string;
  readonly payment_id: string | null;
  readonly status: string;
  readonly uuid: string | null;
  readonly provider_id: string | null;
  readonly xml_key: string | null;
  readonly pdf_key: string | null;
  readonly failure_reason: string | null;
  readonly cancellation_motive: string | null;
  readonly cancellation_requested_at: number | null;
  readonly cancellation_resolved_at: number | null;
  readonly cancellation_expires_at: number | null;
  readonly cancellation_detail: string | null;
  readonly acuse_key: string | null;
  readonly substitution_uuid: string | null;
  readonly created_at: number;
  readonly updated_at: number;
};

export class D1CfdiInvoiceRepository implements CfdiInvoiceRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: NewCfdiInvoice): Promise<CfdiInvoice> {
    const id = crypto.randomUUID();
    const now = new Date();

    await this.db
      .prepare(
        `INSERT INTO cfdi_invoices (id, account_id, payment_id, status, uuid, provider_id, xml_key, pdf_key, failure_reason, cancellation_motive, cancellation_requested_at, cancellation_resolved_at, cancellation_expires_at, cancellation_detail, acuse_key, substitution_uuid, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.accountId,
        input.paymentId,
        input.status,
        input.uuid,
        input.providerId,
        input.xmlKey,
        input.pdfKey,
        input.failureReason,
        input.cancellationMotive,
        input.cancellationRequestedAt === null ? null : toEpoch(input.cancellationRequestedAt),
        input.cancellationResolvedAt === null ? null : toEpoch(input.cancellationResolvedAt),
        input.cancellationExpiresAt === null ? null : toEpoch(input.cancellationExpiresAt),
        input.cancellationDetail,
        input.acuseKey,
        input.substitutionUuid,
        toEpoch(now),
        toEpoch(now),
      )
      .run();

    return {
      id,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
  }

  async listByAccount(input: ListInvoicesInput): Promise<OffsetPage<CfdiInvoice>> {
    const results = await this.db
      .prepare(
        `SELECT ${COLUMNS}
        FROM cfdi_invoices
        WHERE account_id = ? AND status <> 'failed'
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        OFFSET ?`,
      )
      .bind(input.accountId, input.limit, input.offset)
      .all();

    return paginateOffset(
      results.results.map((row) => mapRow(row as CfdiInvoiceRow)),
      input.limit,
      input.offset,
    );
  }

  async markCancellationRequested(input: {
    id: string;
    accountId: string;
    motive: CfdiCancellationMotive;
    requestedAt: Date;
  }): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE cfdi_invoices
        SET status = 'cancellation_pending', cancellation_motive = ?, cancellation_requested_at = ?, updated_at = ?
        WHERE id = ? AND account_id = ? AND status = 'issued'`,
      )
      .bind(
        input.motive,
        toEpoch(input.requestedAt),
        toEpoch(input.requestedAt),
        input.id,
        input.accountId,
      )
      .run();

    return (result.meta?.changes ?? 0) === 1;
  }

  async recordCancellationOutcome(input: CancellationOutcomeUpdate): Promise<void> {
    await this.db
      .prepare(
        `UPDATE cfdi_invoices
        SET status = ?, cancellation_resolved_at = ?, cancellation_expires_at = ?, cancellation_detail = ?, acuse_key = ?, updated_at = ?
        WHERE id = ? AND account_id = ?`,
      )
      .bind(
        input.status,
        input.resolvedAt === null ? null : toEpoch(input.resolvedAt),
        input.expiresAt === null ? null : toEpoch(input.expiresAt),
        input.detail,
        input.acuseKey,
        toEpoch(input.updatedAt),
        input.id,
        input.accountId,
      )
      .run();
  }

  async recordSubstitutionUuid(input: {
    id: string;
    accountId: string;
    substitutionUuid: string;
    updatedAt: Date;
  }): Promise<void> {
    await this.db
      .prepare(
        `UPDATE cfdi_invoices
        SET substitution_uuid = ?, updated_at = ?
        WHERE id = ? AND account_id = ?`,
      )
      .bind(input.substitutionUuid, toEpoch(input.updatedAt), input.id, input.accountId)
      .run();
  }

  async listPendingCancellations(input: {
    accountId: string;
    limit: number;
  }): Promise<CfdiInvoice[]> {
    const results = await this.db
      .prepare(
        `SELECT ${COLUMNS}
        FROM cfdi_invoices
        WHERE account_id = ? AND status = 'cancellation_pending'
        ORDER BY updated_at ASC
        LIMIT ?`,
      )
      .bind(input.accountId, input.limit)
      .all();

    return results.results.map((row) => mapRow(row as CfdiInvoiceRow));
  }

  async listPendingCancellationsForAllAccounts(input: { limit: number }): Promise<CfdiInvoice[]> {
    const results = await this.db
      .prepare(
        `SELECT ${COLUMNS}
        FROM cfdi_invoices
        WHERE status = 'cancellation_pending'
        ORDER BY updated_at ASC
        LIMIT ?`,
      )
      .bind(input.limit)
      .all();

    return results.results.map((row) => mapRow(row as CfdiInvoiceRow));
  }

  async getByIdForAccount(accountId: string, id: string): Promise<CfdiInvoice | null> {
    const row = await this.db
      .prepare(
        `SELECT ${COLUMNS}
        FROM cfdi_invoices
        WHERE id = ? AND account_id = ?`,
      )
      .bind(id, accountId)
      .first();

    return row === null ? null : mapRow(row as CfdiInvoiceRow);
  }
}

function mapRow(row: CfdiInvoiceRow): CfdiInvoice {
  const createdAt = fromEpoch(row.created_at);
  const updatedAt = fromEpoch(row.updated_at);

  // Timestamps are NOT NULL in the schema; a null here means the row predates it.
  if (createdAt === null || updatedAt === null) {
    throw new Error(`cfdi_invoices row ${row.id} has no timestamps`);
  }

  return {
    id: row.id,
    accountId: row.account_id,
    paymentId: row.payment_id,
    status: row.status as CfdiInvoiceStatus,
    uuid: row.uuid,
    providerId: row.provider_id,
    xmlKey: row.xml_key,
    pdfKey: row.pdf_key,
    failureReason: row.failure_reason,
    cancellationMotive: row.cancellation_motive as CfdiCancellationMotive | null,
    cancellationRequestedAt: fromEpoch(row.cancellation_requested_at),
    cancellationResolvedAt: fromEpoch(row.cancellation_resolved_at),
    cancellationExpiresAt: fromEpoch(row.cancellation_expires_at),
    cancellationDetail: row.cancellation_detail,
    acuseKey: row.acuse_key,
    substitutionUuid: row.substitution_uuid ?? null,
    createdAt,
    updatedAt,
  };
}
