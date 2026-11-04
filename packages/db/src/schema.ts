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

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  planId: text("plan_id").notNull().default("community"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  audience: text("audience").notNull(),
  description: text("description").notNull(),
  benefits: text("benefits").notNull(), // JSON array as text
  priceMonthly: integer("price_monthly").notNull(),
  priceAnnual: integer("price_annual").notNull(),
  currency: text("currency").notNull().default("MXN"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id),
  status: text("status").notNull().default("active"),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id")
    .notNull()
    .references(() => subscriptions.id),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("MXN"),
  status: text("status").notNull().default("pending"),
  paidAt: integer("paid_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id")
    .notNull()
    .references(() => payments.id),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("MXN"),
  issuedAt: integer("issued_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const businesses = sqliteTable("businesses", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  timezone: text("timezone").notNull(),
  delivery: integer("delivery", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => businesses.id),
  name: text("name").notNull(),
  description: text("description"),
  basePrice: integer("base_price"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const workEntries = sqliteTable("work_entries", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => businesses.id),
  title: text("title").notNull(),
  description: text("description"),
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
  description: text("description"),
  price: integer("price").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .references(() => businesses.id),
  workEntryId: text("work_entry_id").references(() => workEntries.id),
  productId: text("product_id").references(() => products.id),
  kind: text("kind").notNull(), // "logo" | "product" | "work"
  url: text("url").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const flyers = sqliteTable("flyers", {
  id: text("id").primaryKey(),
  businessId: text("business_id")
    .notNull()
    .unique()
    .references(() => businesses.id),
  url: text("url").notNull(),
  replacedAt: integer("replaced_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
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
