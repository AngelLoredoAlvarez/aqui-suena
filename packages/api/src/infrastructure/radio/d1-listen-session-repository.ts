import type {
  ActiveListenSessionInput,
  ListenSessionRepository,
} from "@aqui-suena/api/domain/radio/listen-session";
import { toEpoch } from "@aqui-suena/api/infrastructure/d1/d1-epoch";

export class D1ListenSessionRepository implements ListenSessionRepository {
  constructor(private readonly db: D1Database) {}

  async activeListeners(stationId: string, since: Date): Promise<number> {
    const row = await this.db
      .prepare(
        `SELECT COALESCE(SUM(listeners), 0) AS total
         FROM listen_sessions
         WHERE station_id = ? AND ended_at IS NULL AND started_at > ?`,
      )
      .bind(stationId, toEpoch(since))
      .first();

    return row ? Number((row as { total: number }).total) : 0;
  }

  async upsertActive(input: ActiveListenSessionInput): Promise<void> {
    const result = await this.db
      .prepare(
        `INSERT INTO listen_sessions (id, station_id, started_at, ended_at, listeners)
         VALUES (?, ?, ?, NULL, ?)
         ON CONFLICT(id) DO UPDATE SET
           station_id = excluded.station_id,
           started_at = excluded.started_at,
           ended_at = NULL,
           listeners = excluded.listeners`,
      )
      .bind(input.id, input.stationId, toEpoch(input.startedAt), input.listeners)
      .run();

    if (!result.success) {
      throw new Error("Failed to refresh listen session");
    }
  }
}
