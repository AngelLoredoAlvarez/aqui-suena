import type {
  CfdiInvoice,
  CfdiInvoiceRepository,
  CfdiInvoiceStatus,
  ListInvoicesInput,
  NewCfdiInvoice,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import { fromEpoch, toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { type OffsetPage, paginateOffset } from "@aqui-suena/api/shared/pagination/page";

const COLUMNS =
  "id, account_id, payment_id, status, uuid, provider_id, xml_key, pdf_key, failure_reason, created_at, updated_at";

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
        `INSERT INTO cfdi_invoices (id, account_id, payment_id, status, uuid, provider_id, xml_key, pdf_key, failure_reason, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        WHERE account_id = ? AND status = 'issued'
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

  async getByIdForAccount(accountId: string, id: string): Promise<CfdiInvoice | null> {
    const row = await this.db
      .prepare(
        `SELECT ${COLUMNS}
        FROM cfdi_invoices
        WHERE id = ? AND account_id = ? AND status = 'issued'`,
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
    createdAt,
    updatedAt,
  };
}
