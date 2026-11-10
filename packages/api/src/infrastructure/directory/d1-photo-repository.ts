import type {
  CreatePhotoInput,
  Photo,
  PhotoRepository,
  UpdatePhotoInput,
} from "@aqui-suena/api/domain/directory/photo";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";

type PhotoRow = {
  id: string;
  business_id: string;
  work_entry_id: string | null;
  product_id: string | null;
  kind: string;
  url: string;
  created_at: number;
};

export class D1PhotoRepository implements PhotoRepository {
  constructor(private readonly db: D1Database) {}

  async list(): Promise<Photo[]> {
    const results = await this.db
      .prepare(
        "SELECT id, business_id, work_entry_id, product_id, kind, url, created_at FROM photos",
      )
      .all();

    return results.results.map((row) => this.mapRow(row as PhotoRow));
  }

  async getById(id: string): Promise<Photo | null> {
    const row = await this.db
      .prepare(
        "SELECT id, business_id, work_entry_id, product_id, kind, url, created_at FROM photos WHERE id = ?",
      )
      .bind(id)
      .first();

    return row ? this.mapRow(row as PhotoRow) : null;
  }

  async listByBusiness(businessId: string): Promise<Photo[]> {
    const results = await this.db
      .prepare(
        "SELECT id, business_id, work_entry_id, product_id, kind, url, created_at FROM photos WHERE business_id = ?",
      )
      .bind(businessId)
      .all();

    return results.results.map((row) => this.mapRow(row as PhotoRow));
  }

  async create(input: CreatePhotoInput): Promise<Photo> {
    const id = crypto.randomUUID();
    const now = toEpoch(new Date());
    const result = await this.db
      .prepare(
        "INSERT INTO photos (id, business_id, work_entry_id, product_id, kind, url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(id, input.businessId, input.workEntryId, input.productId, input.kind, input.url, now)
      .run();

    if (!result.success) {
      throw new Error("Failed to create photo");
    }

    return this.mapRow({
      id,
      business_id: input.businessId,
      work_entry_id: input.workEntryId,
      product_id: input.productId,
      kind: input.kind,
      url: input.url,
      created_at: now,
    });
  }

  async update(id: string, input: UpdatePhotoInput): Promise<Photo | null> {
    const current = await this.getById(id);

    if (!current) return null;

    const updated: Photo = {
      ...current,
      workEntryId: input.workEntryId !== undefined ? input.workEntryId : current.workEntryId,
      productId: input.productId !== undefined ? input.productId : current.productId,
      kind: input.kind ?? current.kind,
      url: input.url ?? current.url,
    };

    const result = await this.db
      .prepare(
        "UPDATE photos SET work_entry_id = ?, product_id = ?, kind = ?, url = ? WHERE id = ?",
      )
      .bind(updated.workEntryId, updated.productId, updated.kind, updated.url, id)
      .run();

    if (!result.success) {
      throw new Error("Failed to update photo");
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM photos WHERE id = ?").bind(id).run();

    return result.success && (result.meta?.changes ?? 0) > 0;
  }

  private mapRow(row: PhotoRow): Photo {
    return {
      id: row.id,
      businessId: row.business_id,
      workEntryId: row.work_entry_id,
      productId: row.product_id,
      kind: row.kind as Photo["kind"],
      url: row.url,
      createdAt: new Date(row.created_at * 1000),
    };
  }
}
