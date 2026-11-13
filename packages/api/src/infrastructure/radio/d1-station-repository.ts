import type { Station, StationRepository } from "@aqui-suena/api/domain/radio/station";

type StationRow = {
  id: string;
  name: string;
  stream_url: string;
};

export class D1StationRepository implements StationRepository {
  constructor(private readonly db: D1Database) {}

  async getById(id: string): Promise<Station | null> {
    const row = await this.db
      .prepare("SELECT id, name, stream_url FROM stations WHERE id = ?")
      .bind(id)
      .first();

    return row ? this.mapRow(row as StationRow) : null;
  }

  async list(): Promise<Station[]> {
    const results = await this.db.prepare("SELECT id, name, stream_url FROM stations").all();

    return results.results.map((row) => this.mapRow(row as StationRow));
  }

  private mapRow(row: StationRow): Station {
    return {
      id: row.id,
      name: row.name,
      streamUrl: row.stream_url,
    };
  }
}
