import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { apply, migrationFiles } from "./support.mjs";

const TARGET_PREFIX = "0015_";

function targetMigration() {
  const file = migrationFiles().find((name) => name.startsWith(TARGET_PREFIX));

  if (file === undefined) {
    throw new Error(`missing ${TARGET_PREFIX}* migration for the media links`);
  }

  return file;
}

function seedBusiness(database) {
  database.exec(`
    INSERT INTO accounts (id, email, created_at, updated_at)
    VALUES ('acc-1', 'owner@example.com', 1, 1);
    INSERT INTO businesses (id, account_id, name, category, timezone, created_at, updated_at)
    VALUES ('biz-1', 'acc-1', 'One', 'food', 'America/Mexico_City', 1, 1);
  `);
}

function seedLegacyDirectoryRows(database) {
  database.exec(`
    INSERT INTO photos (id, business_id, kind, url, created_at)
    VALUES ('photo-legacy', 'biz-1', 'logo', 'https://example.test/logo.png', 1);
    INSERT INTO flyers (id, business_id, url, replaced_at, created_at, updated_at)
    VALUES ('flyer-legacy', 'biz-1', 'https://example.test/flyer.jpg', 1, 1, 1);
  `);
}

function seedMedia(database) {
  database.exec(`
    INSERT INTO media (id, owner_id, business_id, kind, r2_key, mime, size, created_at)
    VALUES ('med-1', 'acc-1', 'biz-1', 'product-photo', 'media/v1/acc-1/businesses/biz-1/product-photo/a.webp', 'image/webp', 1, 1);
    INSERT INTO media (id, owner_id, business_id, kind, r2_key, mime, size, created_at)
    VALUES ('med-2', 'acc-1', 'biz-1', 'flyer', 'media/v1/acc-1/businesses/biz-1/flyer/b.jpg', 'image/jpeg', 1, 1);
  `);
}

describe("migration 0015", () => {
  it("keeps legacy urls and leaves their media link empty", () => {
    const database = new DatabaseSync(":memory:");

    apply(
      database,
      migrationFiles().filter((file) => file < targetMigration()),
    );
    seedBusiness(database);
    seedLegacyDirectoryRows(database);
    apply(database, [targetMigration()]);

    const photo = database
      .prepare("SELECT media_id, url FROM photos WHERE id = 'photo-legacy'")
      .get();
    const flyer = database
      .prepare("SELECT media_id, url FROM flyers WHERE id = 'flyer-legacy'")
      .get();

    expect(photo).toEqual({ media_id: null, url: "https://example.test/logo.png" });
    expect(flyer).toEqual({ media_id: null, url: "https://example.test/flyer.jpg" });
    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("requires media or a legacy url, and cascades when media is deleted", () => {
    const database = new DatabaseSync(":memory:");

    database.exec("PRAGMA foreign_keys = ON");
    apply(database, migrationFiles());
    seedBusiness(database);
    seedMedia(database);

    database
      .prepare(
        "INSERT INTO photos (id, business_id, kind, media_id, url, created_at) VALUES ('photo-media', 'biz-1', 'logo', 'med-1', NULL, 2)",
      )
      .run();
    database
      .prepare(
        "INSERT INTO flyers (id, business_id, media_id, url, replaced_at, created_at, updated_at) VALUES ('flyer-media', 'biz-1', 'med-2', NULL, 2, 2, 2)",
      )
      .run();

    expect(() =>
      database
        .prepare(
          "INSERT INTO photos (id, business_id, kind, media_id, url, created_at) VALUES ('photo-empty', 'biz-1', 'logo', NULL, NULL, 3)",
        )
        .run(),
    ).toThrow(/CHECK constraint failed/);
    expect(() =>
      database
        .prepare(
          "INSERT INTO flyers (id, business_id, media_id, url, replaced_at, created_at, updated_at) VALUES ('flyer-empty', 'biz-1', NULL, NULL, 3, 3, 3)",
        )
        .run(),
    ).toThrow(/CHECK constraint failed/);

    database.prepare("DELETE FROM media WHERE id = 'med-1'").run();
    database.prepare("DELETE FROM media WHERE id = 'med-2'").run();

    expect(
      database.prepare("SELECT COUNT(*) AS count FROM photos WHERE id = 'photo-media'").get()
        ?.count,
    ).toBe(0);
    expect(
      database.prepare("SELECT COUNT(*) AS count FROM flyers WHERE id = 'flyer-media'").get()
        ?.count,
    ).toBe(0);
    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
});
