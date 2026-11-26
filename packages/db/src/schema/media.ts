import { accounts } from "@aqui-suena/db/schema/accounts";
import { businesses, products, workEntries } from "@aqui-suena/db/schema/directory";
import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Media rows (R2-backed) and the directory attachments that point at them.
// Photos and flyers live here because they reference `media`; keeping them in
// `directory` would make directory -> media -> directory an import cycle.
export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => accounts.id),
  businessId: text("business_id").references(() => businesses.id),
  kind: text("kind").notNull(), // "product-photo" | "flyer" | "spot-audio" | "avatar"
  r2Key: text("r2_key").notNull().unique(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    workEntryId: text("work_entry_id").references(() => workEntries.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => products.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // "logo" | "product" | "work"
    mediaId: text("media_id").references(() => media.id, { onDelete: "cascade" }),
    url: text("url"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("photos_media_id_unique").on(table.mediaId),
    check("photos_media_or_url", sql`${table.mediaId} IS NOT NULL OR ${table.url} IS NOT NULL`),
  ],
);

export const flyers = sqliteTable(
  "flyers",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .unique()
      .references(() => businesses.id, { onDelete: "cascade" }),
    mediaId: text("media_id").references(() => media.id, { onDelete: "cascade" }),
    url: text("url"),
    replacedAt: integer("replaced_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("flyers_media_id_unique").on(table.mediaId),
    check("flyers_media_or_url", sql`${table.mediaId} IS NOT NULL OR ${table.url} IS NOT NULL`),
  ],
);
