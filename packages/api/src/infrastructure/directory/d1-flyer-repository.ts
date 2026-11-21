import type {
  CreateFlyerInput,
  Flyer,
  FlyerRepository,
  ListFlyersInput,
  UpdateFlyerInput,
} from "@aqui-suena/api/domain/directory/flyer";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { ConflictError } from "@aqui-suena/api/shared/domain-error";
import { decodeCursor } from "@aqui-suena/api/shared/pagination/cursor";
import type { CursorPage } from "@aqui-suena/api/shared/pagination/page";
import { paginateCursor } from "@aqui-suena/api/shared/pagination/page";

function isDuplicateMedia(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed") &&
    error.message.includes("flyers.media_id")
  );
}

type FlyerRow = {
  id: string;
  business_id: string;
  media_id: string | null;
  url: string | null;
  replaced_at: number;
  created_at: number;
  updated_at: number;
};

export class D1FlyerRepository implements FlyerRepository {
  constructor(private readonly db: D1Database) {}

  async list(input: ListFlyersInput): Promise<CursorPage<Flyer>> {
    const point = input.cursor === null ? null : decodeCursor(input.cursor);

    const base = `SELECT f.id, f.business_id, f.media_id, f.url, f.replaced_at, f.created_at, f.updated_at
     FROM flyers f
     JOIN businesses b ON b.id = f.business_id
     WHERE b.hidden_at IS NULL`;

    const sql =
      point === null
        ? `${base} ORDER BY f.created_at, f.id LIMIT ?`
        : `${base} AND (f.created_at, f.id) > (?, ?) ORDER BY f.created_at, f.id LIMIT ?`;

    const limitPlusOne = input.limit + 1;

    const statement = this.db.prepare(sql);

    const result =
      point === null
        ? await statement.bind(limitPlusOne).all()
        : await statement.bind(point.createdAt, point.id, limitPlusOne).all();

    const flyers = result.results.map((row) => this.mapRow(row as FlyerRow));

    return paginateCursor(flyers, input.limit, (flyer) => ({
      createdAt: toEpoch(flyer.createdAt),
      id: flyer.id,
    }));
  }

  async getById(id: string): Promise<Flyer | null> {
    const row = await this.db
      .prepare(
        "SELECT id, business_id, media_id, url, replaced_at, created_at, updated_at FROM flyers WHERE id = ?",
      )
      .bind(id)
      .first();

    return row ? this.mapRow(row as FlyerRow) : null;
  }

  async findByMediaId(mediaId: string): Promise<Flyer | null> {
    const row = await this.db
      .prepare(
        "SELECT id, business_id, media_id, url, replaced_at, created_at, updated_at FROM flyers WHERE media_id = ?",
      )
      .bind(mediaId)
      .first();

    return row ? this.mapRow(row as FlyerRow) : null;
  }

  async listByBusiness(businessId: string): Promise<Flyer[]> {
    const results = await this.db
      .prepare(
        "SELECT id, business_id, media_id, url, replaced_at, created_at, updated_at FROM flyers WHERE business_id = ?",
      )
      .bind(businessId)
      .all();

    return results.results.map((row) => this.mapRow(row as FlyerRow));
  }

  async create(input: CreateFlyerInput): Promise<Flyer> {
    const id = crypto.randomUUID();

    const now = toEpoch(new Date());

    const result = await this.runWithMediaConflict(
      this.db
        .prepare(
          `INSERT INTO flyers (id, business_id, media_id, url, replaced_at, created_at, updated_at)
        VALUES (?, ?, ?, NULL, ?, ?, ?)`,
        )
        .bind(id, input.businessId, input.mediaId, now, now, now),
    );

    if (!result.success) {
      throw new Error("Failed to create flyer");
    }

    return this.mapRow({
      id,
      business_id: input.businessId,
      media_id: input.mediaId,
      url: null,
      replaced_at: now,
      created_at: now,
      updated_at: now,
    });
  }

  async update(id: string, input: UpdateFlyerInput): Promise<Flyer | null> {
    const current = await this.getById(id);

    if (!current) return null;

    const now = new Date();

    const replaced = input.mediaId !== undefined;

    const updated: Flyer = {
      ...current,
      mediaId: input.mediaId ?? current.mediaId,
      replacedAt: replaced ? now : current.replacedAt,
      updatedAt: now,
    };

    const result = await this.runWithMediaConflict(
      this.db
        .prepare("UPDATE flyers SET media_id = ?, replaced_at = ?, updated_at = ? WHERE id = ?")
        .bind(updated.mediaId, toEpoch(updated.replacedAt), toEpoch(now), id),
    );

    if (!result.success) {
      throw new Error("Failed to update flyer");
    }

    return updated;
  }

  private async runWithMediaConflict<T>(statement: { run(): Promise<T> }): Promise<T> {
    try {
      return await statement.run();
    } catch (error) {
      if (isDuplicateMedia(error)) {
        throw new ConflictError("Media is already attached");
      }

      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM flyers WHERE id = ?").bind(id).run();

    return result.success && (result.meta?.changes ?? 0) > 0;
  }

  private mapRow(row: FlyerRow): Flyer {
    return {
      id: row.id,
      businessId: row.business_id,
      mediaId: row.media_id,
      url: row.url,
      replacedAt: new Date(row.replaced_at * 1000),
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };
  }
}
