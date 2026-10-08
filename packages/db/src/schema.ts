import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Metadata only: stations and listen sessions. Audio never touches the DB.
export const stations = pgTable("stations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  streamUrl: text("stream_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const listenSessions = pgTable("listen_sessions", {
  id: text("id").primaryKey(),
  stationId: text("station_id")
    .notNull()
    .references(() => stations.id),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  listeners: integer("listeners").default(0).notNull(),
});
