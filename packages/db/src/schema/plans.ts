import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
