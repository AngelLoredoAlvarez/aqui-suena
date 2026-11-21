import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { apply, migrationFiles } from "./support.mjs";

const TARGET_PREFIX = "0016_";

function targetMigration() {
  const file = migrationFiles().find((name) => name.startsWith(TARGET_PREFIX));

  if (file === undefined) {
    throw new Error(`missing ${TARGET_PREFIX}* migration for unique media links`);
  }

  return file;
}

function seed(database) {
  database.exec(`
    INSERT INTO accounts (id, email, created_at, updated_at)
    VALUES ('acc-1', 'owner@example.com', 1, 1);
    INSERT INTO businesses (id, account_id, name, category, timezone, created_at, updated_at)
    VALUES
      ('biz-1', 'acc-1', 'One', 'food', 'America/Mexico_City', 1, 1),
      ('biz-2', 'acc-1', 'Two', 'food', 'America/Mexico_City', 1, 1);
    INSERT INTO media (id, owner_id, business_id, kind, r2_key, mime, size, created_at)
    VALUES
      ('med-1', 'acc-1', 'biz-1', 'product-photo', 'media/v1/a.webp', 'image/webp', 1, 1),
      ('med-2', 'acc-1', 'biz-1', 'flyer', 'media/v1/b.jpg', 'image/jpeg', 1, 1);
    INSERT INTO photos (id, business_id, kind, media_id, url, created_at)
    VALUES
      ('photo-legacy-1', 'biz-1', 'logo', NULL, 'https://example.test/one.png', 1),
      ('photo-legacy-2', 'biz-1', 'logo', NULL, 'https://example.test/two.png', 2);
  `);
}

describe("migration 0016", () => {
  it("allows many null media links but only one row per media id", () => {
    const database = new DatabaseSync(":memory:");

    database.exec("PRAGMA foreign_keys = ON");
    apply(database, migrationFiles());
    seed(database);

    database
      .prepare(
        "INSERT INTO photos (id, business_id, kind, media_id, url, created_at) VALUES ('photo-media', 'biz-1', 'logo', 'med-1', NULL, 3)",
      )
      .run();
    database
      .prepare(
        "INSERT INTO flyers (id, business_id, media_id, url, replaced_at, created_at, updated_at) VALUES ('flyer-media', 'biz-1', 'med-2', NULL, 1, 1, 1)",
      )
      .run();

    expect(() =>
      database
        .prepare(
          "INSERT INTO photos (id, business_id, kind, media_id, url, created_at) VALUES ('photo-dup', 'biz-1', 'logo', 'med-1', NULL, 4)",
        )
        .run(),
    ).toThrow(/UNIQUE constraint failed/);
    expect(() =>
      database
        .prepare(
          "INSERT INTO flyers (id, business_id, media_id, url, replaced_at, created_at, updated_at) VALUES ('flyer-dup', 'biz-2', 'med-2', NULL, 1, 1, 1)",
        )
        .run(),
    ).toThrow(/UNIQUE constraint failed/);

    expect(
      database.prepare("SELECT COUNT(*) AS count FROM photos WHERE media_id IS NULL").get()?.count,
    ).toBe(2);
    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("is the migration that creates both unique indexes", () => {
    const database = new DatabaseSync(":memory:");

    apply(
      database,
      migrationFiles().filter((file) => file < targetMigration()),
    );
    apply(database, [targetMigration()]);

    const indexes = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE '%media_id_unique'",
      )
      .all()
      .map((row) => row.name)
      .sort();

    expect(indexes).toEqual(["flyers_media_id_unique", "photos_media_id_unique"]);
  });
});
