import type { CreateMediaInput, Media, MediaRepository } from "@aqui-suena/api/domain/media/media";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";

type MediaRow = {
  id: string;
  owner_id: string;
  kind: string;
  r2_key: string;
  mime: string;
  size: number;
  created_at: number;
};

export class D1MediaRepository implements MediaRepository {
  constructor(private readonly db: D1Database) {}

  async listByOwner(ownerId: string): Promise<Media[]> {
    const results = await this.db
      .prepare(
        "SELECT id, owner_id, kind, r2_key, mime, size, created_at FROM media WHERE owner_id = ?",
      )
      .bind(ownerId)
      .all();

    return results.results.map((row) => this.mapRow(row as MediaRow));
  }

  async getById(id: string): Promise<Media | null> {
    const row = await this.db
      .prepare("SELECT id, owner_id, kind, r2_key, mime, size, created_at FROM media WHERE id = ?")
      .bind(id)
      .first();

    return row ? this.mapRow(row as MediaRow) : null;
  }

  async create(input: CreateMediaInput): Promise<Media> {
    const id = crypto.randomUUID();
    const now = toEpoch(new Date());

    const result = await this.db
      .prepare(
        "INSERT INTO media (id, owner_id, kind, r2_key, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(id, input.ownerId, input.kind, input.r2Key, input.mime, input.size, now)
      .run();

    if (!result.success) {
      throw new Error("Failed to create media");
    }

    return this.mapRow({
      id,
      owner_id: input.ownerId,
      kind: input.kind,
      r2_key: input.r2Key,
      mime: input.mime,
      size: input.size,
      created_at: now,
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM media WHERE id = ?").bind(id).run();
    return result.success && (result.meta?.changes ?? 0) > 0;
  }

  private mapRow(row: MediaRow): Media {
    return {
      id: row.id,
      ownerId: row.owner_id,
      kind: row.kind as Media["kind"],
      r2Key: row.r2_key,
      mime: row.mime,
      size: row.size,
      createdAt: new Date(row.created_at * 1000),
    };
  }
}
