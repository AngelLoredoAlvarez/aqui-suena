import type {
  CreatePhotoInput,
  ListPhotosByBusinessInput,
  Photo,
  PhotoRepository,
  UpdatePhotoInput,
} from "@aqui-suena/api/domain/directory/model/photo";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";
import { ConflictError } from "@aqui-suena/api/shared/domain-error";
import type { OffsetPage } from "@aqui-suena/api/shared/pagination/page";
import { paginateOffset } from "@aqui-suena/api/shared/pagination/page";

function isDuplicateMedia(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed") &&
    error.message.includes("photos.media_id")
  );
}

type PhotoRow = {
  id: string;
  business_id: string;
  work_entry_id: string | null;
  product_id: string | null;
  kind: string;
  media_id: string | null;
  url: string | null;
  created_at: number;
};

export class D1PhotoRepository implements PhotoRepository {
  constructor(private readonly db: D1Database) {}

  async getById(id: string): Promise<Photo | null> {
    const row = await this.db
      .prepare(
        "SELECT id, business_id, work_entry_id, product_id, kind, media_id, url, created_at FROM photos WHERE id = ?",
      )
      .bind(id)
      .first();

    return row ? this.mapRow(row as PhotoRow) : null;
  }

  async findByMediaId(mediaId: string): Promise<Photo | null> {
    const row = await this.db
      .prepare(
        "SELECT id, business_id, work_entry_id, product_id, kind, media_id, url, created_at FROM photos WHERE media_id = ?",
      )
      .bind(mediaId)
      .first();

    return row ? this.mapRow(row as PhotoRow) : null;
  }

  async listByBusiness(input: ListPhotosByBusinessInput): Promise<OffsetPage<Photo>> {
    const results = await this.db
      .prepare(
        `SELECT id, business_id, work_entry_id, product_id, kind, media_id, url, created_at
        FROM photos
        WHERE business_id = ?
        ORDER BY created_at, id
        LIMIT ?
        OFFSET ?`,
      )
      .bind(input.businessId, input.limit, input.offset)
      .all();

    return paginateOffset(
      results.results.map((row) => this.mapRow(row as PhotoRow)),
      input.limit,
      input.offset,
    );
  }

  async create(input: CreatePhotoInput): Promise<Photo> {
    const id = crypto.randomUUID();

    const now = toEpoch(new Date());

    const result = await this.runWithMediaConflict(
      this.db
        .prepare(
          `INSERT INTO photos (id, business_id, work_entry_id, product_id, kind, media_id, url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
        )
        .bind(
          id,
          input.businessId,
          input.workEntryId,
          input.productId,
          input.kind,
          input.mediaId,
          now,
        ),
    );

    if (!result.success) {
      throw new Error("Failed to create photo");
    }

    return this.mapRow({
      id,
      business_id: input.businessId,
      work_entry_id: input.workEntryId,
      product_id: input.productId,
      kind: input.kind,
      media_id: input.mediaId,
      url: null,
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
      mediaId: input.mediaId ?? current.mediaId,
    };

    const result = await this.runWithMediaConflict(
      this.db
        .prepare(
          "UPDATE photos SET work_entry_id = ?, product_id = ?, kind = ?, media_id = ? WHERE id = ?",
        )
        .bind(updated.workEntryId, updated.productId, updated.kind, updated.mediaId, id),
    );

    if (!result.success) {
      throw new Error("Failed to update photo");
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
      mediaId: row.media_id,
      url: row.url,
      createdAt: new Date(row.created_at * 1000),
    };
  }
}
