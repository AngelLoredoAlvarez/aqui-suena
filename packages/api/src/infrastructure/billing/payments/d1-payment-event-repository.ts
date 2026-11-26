import type {
  NewPaymentEvent,
  PaymentEvent,
  PaymentEventRepository,
} from "@aqui-suena/api/domain/billing/payments/model/payment-event";
import { fromEpoch, toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";

type PaymentEventRow = {
  id: string;
  provider_event_id: string;
  type: string;
  payment_id: string | null;
  payload_hash: string;
  livemode: number;
  processed_at: number | null;
  created_at: number;
};

export class D1PaymentEventRepository implements PaymentEventRepository {
  constructor(private readonly db: D1Database) {}

  async record(input: NewPaymentEvent): Promise<PaymentEvent> {
    const id = crypto.randomUUID();
    const now = new Date();

    await this.db
      .prepare(
        `INSERT OR IGNORE INTO payment_events
        (id, provider_event_id, type, payment_id, payload_hash, livemode, processed_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
      )
      .bind(
        id,
        input.providerEventId,
        input.type,
        input.paymentId,
        input.payloadHash,
        input.livemode ? 1 : 0,
        toEpoch(now),
      )
      .run();

    const event = await this.getByProviderEventId(input.providerEventId);

    if (event === null) {
      throw new DataIntegrityError("providerEventId", input.providerEventId);
    }

    return event;
  }

  async getByProviderEventId(id: string): Promise<PaymentEvent | null> {
    const row = await this.db
      .prepare(
        `SELECT id, provider_event_id, type, payment_id, payload_hash, livemode, processed_at, created_at
        FROM payment_events
        WHERE provider_event_id = ?`,
      )
      .bind(id)
      .first();

    return row === null || row === undefined ? null : this.mapRow(row as PaymentEventRow);
  }

  async markProcessed(id: string, paymentId: string | null, processedAt: Date): Promise<void> {
    await this.db
      .prepare("UPDATE payment_events SET payment_id = ?, processed_at = ? WHERE id = ?")
      .bind(paymentId, toEpoch(processedAt), id)
      .run();
  }

  private mapRow(row: PaymentEventRow): PaymentEvent {
    return {
      id: row.id,
      providerEventId: row.provider_event_id,
      type: row.type,
      paymentId: row.payment_id,
      payloadHash: row.payload_hash,
      livemode: row.livemode === 1,
      processedAt: fromEpoch(row.processed_at),
      createdAt: new Date(row.created_at * 1000),
    };
  }
}
