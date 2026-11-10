import type {
  CreateFlyerInput,
  Flyer,
  FlyerRepository,
  UpdateFlyerInput,
} from "@aqui-suena/api/domain/directory/flyer";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";

type FlyerRow = {
  id: string;
  business_id: string;
  url: string;
  replaced_at: number;
  created_at: number;
  updated_at: number;
};

export class D1FlyerRepository implements FlyerRepository {
  constructor(private readonly db: D1Database) {}

  async list(): Promise<Flyer[]> {
    const results = await this.db
      .prepare(
        `SELECT f.id, f.business_id, f.url, f.replaced_at, f.created_at, f.updated_at
         FROM flyers f
         JOIN businesses b ON b.id = f.business_id
         WHERE b.hidden_at IS NULL`,
      )
      .all();

    return results.results.map((row) => this.mapRow(row as FlyerRow));
  }

  async getById(id: string): Promise<Flyer | null> {
    const row = await this.db
      .prepare(
        "SELECT id, business_id, url, replaced_at, created_at, updated_at FROM flyers WHERE id = ?",
      )
      .bind(id)
      .first();

    return row ? this.mapRow(row as FlyerRow) : null;
  }

  async listByBusiness(businessId: string): Promise<Flyer[]> {
    const results = await this.db
      .prepare(
        "SELECT id, business_id, url, replaced_at, created_at, updated_at FROM flyers WHERE business_id = ?",
      )
      .bind(businessId)
      .all();

    return results.results.map((row) => this.mapRow(row as FlyerRow));
  }

  async create(input: CreateFlyerInput): Promise<Flyer> {
    const id = crypto.randomUUID();
    const now = toEpoch(new Date());
    const result = await this.db
      .prepare(
        "INSERT INTO flyers (id, business_id, url, replaced_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(id, input.businessId, input.url, now, now, now)
      .run();

    if (!result.success) {
      throw new Error("Failed to create flyer");
    }

    return this.mapRow({
      id,
      business_id: input.businessId,
      url: input.url,
      replaced_at: now,
      created_at: now,
      updated_at: now,
    });
  }

  async update(id: string, input: UpdateFlyerInput): Promise<Flyer | null> {
    const current = await this.getById(id);

    if (!current) return null;

    const now = new Date();
    const replaced = input.url !== undefined;
    const updated: Flyer = {
      ...current,
      url: input.url ?? current.url,
      replacedAt: replaced ? now : current.replacedAt,
      updatedAt: now,
    };

    const result = await this.db
      .prepare("UPDATE flyers SET url = ?, replaced_at = ?, updated_at = ? WHERE id = ?")
      .bind(updated.url, toEpoch(updated.replacedAt), toEpoch(now), id)
      .run();

    if (!result.success) {
      throw new Error("Failed to update flyer");
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM flyers WHERE id = ?").bind(id).run();

    return result.success && (result.meta?.changes ?? 0) > 0;
  }

  private mapRow(row: FlyerRow): Flyer {
    return {
      id: row.id,
      businessId: row.business_id,
      url: row.url,
      replacedAt: new Date(row.replaced_at * 1000),
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };
  }
}
