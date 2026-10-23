import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Metadata only: stations and listen sessions. Audio never touches the DB.
// SQLite/D1-compatible: timestamps are integer seconds-since-epoch.
export const stations = sqliteTable("stations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  streamUrl: text("stream_url").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const listenSessions = sqliteTable("listen_sessions", {
  id: text("id").primaryKey(),
  stationId: text("station_id")
    .notNull()
    .references(() => stations.id),
  startedAt: integer("started_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  endedAt: integer("ended_at", { mode: "timestamp" }),
  listeners: integer("listeners").default(0).notNull(),
});
