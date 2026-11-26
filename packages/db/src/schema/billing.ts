import { accounts } from "@aqui-suena/db/schema/accounts";
import { plans } from "@aqui-suena/db/schema/plans";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id),
    billingInterval: text("billing_interval", { enum: ["monthly", "annual"] })
      .notNull()
      .default("monthly"),
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
  },
  (table) => [
    index("subscriptions_status_ends_idx").on(table.status, table.endsAt),
    index("subscriptions_status_grace_idx").on(table.status, table.graceEnd),
    index("subscriptions_account_status_idx").on(table.accountId, table.status),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    subscriptionId: text("subscription_id").references(() => subscriptions.id),
    planId: text("plan_id").references(() => plans.id),
    billingInterval: text("billing_interval", { enum: ["monthly", "annual"] })
      .notNull()
      .default("monthly"),
    method: text("method", { enum: ["card", "cash", "spei"] }).notNull(),
    provider: text("provider", { enum: ["conekta"] })
      .notNull()
      .default("conekta"),
    providerOrderId: text("provider_order_id").unique(),
    providerChargeId: text("provider_charge_id"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("MXN"),
    status: text("status").notNull().default("pending"),
    reference: text("reference"),
    nextActionUrl: text("next_action_url"),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    failureReason: text("failure_reason"),
    periodStart: integer("period_start", { mode: "timestamp" }),
    periodEnd: integer("period_end", { mode: "timestamp" }),
    paidAt: integer("paid_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("payments_status_created_idx").on(table.status, table.createdAt),
    index("payments_subscription_created_idx").on(table.subscriptionId, table.createdAt),
  ],
);

export const subscriptionReminders = sqliteTable(
  "subscription_reminders",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["renewal_7d", "renewal_1d"] }).notNull(),
    periodEndsAt: integer("period_ends_at", { mode: "timestamp" }).notNull(),
    sentAt: integer("sent_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("subscription_reminders_subscription_type_period_unique").on(
      table.subscriptionId,
      table.type,
      table.periodEndsAt,
    ),
  ],
);

export const paymentEvents = sqliteTable("payment_events", {
  id: text("id").primaryKey(),
  providerEventId: text("provider_event_id").notNull().unique(),
  type: text("type").notNull(),
  paymentId: text("payment_id").references(() => payments.id),
  payloadHash: text("payload_hash").notNull(),
  livemode: integer("livemode", { mode: "boolean" }).notNull(),
  processedAt: integer("processed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const cfdiInvoices = sqliteTable(
  "cfdi_invoices",
  {
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
    substitutionUuid: text("substitution_uuid"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("cfdi_invoices_status_updated_idx").on(table.status, table.updatedAt)],
);
