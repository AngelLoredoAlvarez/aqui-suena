import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  planId: text("plan_id").notNull().default("community"),
  rfc: text("rfc"),
  legalName: text("legal_name"),
  taxRegime: text("tax_regime"),
  taxZipCode: text("tax_zip_code"),
  cfdiUse: text("cfdi_use"),
  billingEmail: text("billing_email"),
  conektaCustomerId: text("conekta_customer_id"),
  defaultCardSourceId: text("default_card_source_id"),
  cardBrand: text("card_brand"),
  cardLast4: text("card_last4"),
  cardExpMonth: integer("card_exp_month"),
  cardExpYear: integer("card_exp_year"),
  taxDataUpdatedAt: integer("tax_data_updated_at", { mode: "timestamp" }),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const accountPreferences = sqliteTable("account_preferences", {
  accountId: text("account_id")
    .primaryKey()
    .references(() => accounts.id, { onDelete: "cascade" }),
  locale: text("locale", { enum: ["es-MX", "en"] })
    .notNull()
    .default("es-MX"),
  renewalRemindersEnabled: integer("renewal_reminders_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
