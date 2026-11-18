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
  locale: text("locale", { enum: ["es-MX", "en"] })
    .notNull()
    .default("es-MX"),
  rfc: text("rfc"),
  legalName: text("legal_name"),
  taxRegime: text("tax_regime"),
  taxZipCode: text("tax_zip_code"),
  cfdiUse: text("cfdi_use"),
  billingEmail: text("billing_email"),
  taxDataUpdatedAt: integer("tax_data_updated_at", { mode: "timestamp" }),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
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
  graceEnd: integer("grace_end", { mode: "timestamp" }),
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
  planId: text("plan_id").references(() => plans.id),
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

export const cfdiInvoices = sqliteTable("cfdi_invoices", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  paymentId: text("payment_id").references(() => payments.id),
  status: text("status").notNull(),
  uuid: text("uuid"),
  providerId: text("provider_id"),
  xmlKey: text("xml_key"),
  pdfKey: text("pdf_key"),
  failureReason: text("failure_reason"),
  cancellationMotive: text("cancellation_motive"),
  cancellationRequestedAt: integer("cancellation_requested_at", { mode: "timestamp" }),
  cancellationResolvedAt: integer("cancellation_resolved_at", { mode: "timestamp" }),
  cancellationExpiresAt: integer("cancellation_expires_at", { mode: "timestamp" }),
  cancellationDetail: text("cancellation_detail"),
  acuseKey: text("acuse_key"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
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
  hiddenAt: integer("hidden_at", { mode: "timestamp" }),
  retainedUntil: integer("retained_until", { mode: "timestamp" }),
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
    .references(() => businesses.id, { onDelete: "cascade" }),
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
    .references(() => businesses.id, { onDelete: "cascade" }),
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
    .references(() => businesses.id, { onDelete: "cascade" }),
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
    .references(() => businesses.id, { onDelete: "cascade" }),
  workEntryId: text("work_entry_id").references(() => workEntries.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "cascade" }),
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
    .references(() => businesses.id, { onDelete: "cascade" }),
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
    .references(() => businesses.id, { onDelete: "cascade" }),
  day: integer("day").notNull(), // 0..6 (Sun..Sat)
  openMinute: integer("open_minute").notNull(), // minutes since midnight
  closeMinute: integer("close_minute").notNull(),
});

export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => accounts.id),
  kind: text("kind").notNull(), // "product-photo" | "flyer" | "spot-audio" | "avatar"
  r2Key: text("r2_key").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
