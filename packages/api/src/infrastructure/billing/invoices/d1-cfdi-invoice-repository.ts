import type {
  CfdiInvoice,
  CfdiInvoiceRepository,
  NewCfdiInvoice,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";

export class D1CfdiInvoiceRepository implements CfdiInvoiceRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: NewCfdiInvoice): Promise<CfdiInvoice> {
    const id = crypto.randomUUID();
    const now = new Date();

    await this.db
      .prepare(
        `INSERT INTO cfdi_invoices (id, account_id, payment_id, status, uuid, provider_id, xml_key, failure_reason, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.accountId,
        input.paymentId,
        input.status,
        input.uuid,
        input.providerId,
        input.xmlKey,
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
}
