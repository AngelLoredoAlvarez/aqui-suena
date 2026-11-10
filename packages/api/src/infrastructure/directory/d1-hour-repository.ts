import type {
  CreateHourInput,
  Hour,
  HourRepository,
  UpdateHourInput,
} from "@aqui-suena/api/domain/directory/hour";

type HourRow = {
  id: string;
  business_id: string;
  day: number;
  open_minute: number;
  close_minute: number;
};

export class D1HourRepository implements HourRepository {
  constructor(private readonly db: D1Database) {}

  async list(): Promise<Hour[]> {
    const results = await this.db
      .prepare(
        `SELECT h.id, h.business_id, h.day, h.open_minute, h.close_minute
         FROM hours h
         JOIN businesses b ON b.id = h.business_id
         WHERE b.hidden_at IS NULL`,
      )
      .all();

    return results.results.map((row) => this.mapRow(row as HourRow));
  }

  async getById(id: string): Promise<Hour | null> {
    const row = await this.db
      .prepare("SELECT id, business_id, day, open_minute, close_minute FROM hours WHERE id = ?")
      .bind(id)
      .first();

    return row ? this.mapRow(row as HourRow) : null;
  }

  async listByBusiness(businessId: string): Promise<Hour[]> {
    const results = await this.db
      .prepare(
        "SELECT id, business_id, day, open_minute, close_minute FROM hours WHERE business_id = ?",
      )
      .bind(businessId)
      .all();

    return results.results.map((row) => this.mapRow(row as HourRow));
  }

  async create(input: CreateHourInput): Promise<Hour> {
    const id = crypto.randomUUID();
    const result = await this.db
      .prepare(
        "INSERT INTO hours (id, business_id, day, open_minute, close_minute) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(id, input.businessId, input.day, input.openMinute, input.closeMinute)
      .run();

    if (!result.success) {
      throw new Error("Failed to create hour");
    }

    return this.mapRow({
      id,
      business_id: input.businessId,
      day: input.day,
      open_minute: input.openMinute,
      close_minute: input.closeMinute,
    });
  }

  async update(id: string, input: UpdateHourInput): Promise<Hour | null> {
    const current = await this.getById(id);

    if (!current) return null;

    const updated: Hour = {
      ...current,
      day: input.day ?? current.day,
      openMinute: input.openMinute ?? current.openMinute,
      closeMinute: input.closeMinute ?? current.closeMinute,
    };

    const result = await this.db
      .prepare("UPDATE hours SET day = ?, open_minute = ?, close_minute = ? WHERE id = ?")
      .bind(updated.day, updated.openMinute, updated.closeMinute, id)
      .run();

    if (!result.success) {
      throw new Error("Failed to update hour");
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM hours WHERE id = ?").bind(id).run();

    return result.success && (result.meta?.changes ?? 0) > 0;
  }

  private mapRow(row: HourRow): Hour {
    return {
      id: row.id,
      businessId: row.business_id,
      day: row.day,
      openMinute: row.open_minute,
      closeMinute: row.close_minute,
    };
  }
}
