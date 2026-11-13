import type { Station } from "@aqui-suena/api/domain/radio/station";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";

export class D1StationCatalogWriter {
  constructor(private readonly db: D1Database) {}

  async upsert(station: Station): Promise<void> {
    const result = await this.db
      .prepare(
        `INSERT INTO stations (id, name, stream_url, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           stream_url = excluded.stream_url`,
      )
      .bind(station.id, station.name, station.streamUrl, toEpoch(new Date()))
      .run();

    if (!result.success) {
      throw new Error("Failed to seed station");
    }
  }
}
