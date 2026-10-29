import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// SQLite/D1 (Cloudflare). Timestamps are integer seconds-since-epoch.
// Audio never touches the DB. Includes radio metadata (stations/sessions)
// and the business directory (businesses/products/photos/hours).
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

export const businesses = sqliteTable("businesses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // giro enum: food, computing, ...
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  timezone: text("timezone").notNull(), // IANA, e.g. "America/Mexico_City"
  delivery: integer("delivery", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => businesses.id),
  name: text("name").notNull(),
  price: integer("price").notNull(), // minor units (centavos) to avoid floats
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => businesses.id),
  kind: text("kind").notNull(), // "flyer" | "logo" | "product"
  url: text("url").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const hours = sqliteTable("hours", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => businesses.id),
  day: integer("day").notNull(), // 0..6 (Sun..Sat)
  openMinute: integer("open_minute").notNull(), // minutes since midnight
  closeMinute: integer("close_minute").notNull(),
});
