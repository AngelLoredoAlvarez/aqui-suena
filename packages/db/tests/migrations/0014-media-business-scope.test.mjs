import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { apply, migrationFiles } from "./support.mjs";

const TARGET_PREFIX = "0014_";

function targetMigration() {
  const file = migrationFiles().find((name) => name.startsWith(TARGET_PREFIX));

  if (file === undefined) {
    throw new Error(`missing ${TARGET_PREFIX}* migration for the media business scope`);
  }

  return file;
}

function seedAccountAndBusiness(database) {
  database.exec(`
    INSERT INTO accounts (id, email, created_at, updated_at)
    VALUES ('acc-1', 'owner@example.com', 1, 1);
    INSERT INTO businesses (id, account_id, name, category, timezone, created_at, updated_at)
    VALUES ('biz-1', 'acc-1', 'One', 'food', 'America/Mexico_City', 1, 1);
    INSERT INTO media (id, owner_id, kind, r2_key, mime, size, created_at)
    VALUES
      ('med-1', 'acc-1', 'avatar', 'avatar/acc-1/a', 'image/png', 10, 1),
      ('med-2', 'acc-1', 'product-photo', 'product-photo/acc-1/b', 'image/webp', 20, 2);
  `);
}

function columns(database, table) {
  return database.prepare(`PRAGMA table_info(${table})`).all();
}

function foreignKeys(database, table) {
  return database.prepare(`PRAGMA foreign_key_list(${table})`).all();
}

function uniqueIndexes(database, table) {
  return database
    .prepare(`SELECT name FROM pragma_index_list('${table}') WHERE "unique" = 1`)
    .all()
    .map((index) =>
      database
        .prepare("SELECT name FROM pragma_index_info(?) ORDER BY seqno")
        .all(index.name)
        .map((column) => column.name),
    );
}

describe("migration 0014", () => {
  it("keeps existing flat keys and leaves their business scope empty", () => {
    const database = new DatabaseSync(":memory:");

    apply(
      database,
      migrationFiles().filter((file) => file < targetMigration()),
    );
    seedAccountAndBusiness(database);
    apply(database, [targetMigration()]);

    const rows = database
      .prepare("SELECT id, r2_key, business_id FROM media ORDER BY id")
      .all()
      .map((row) => [row.id, row.r2_key, row.business_id]);

    expect(rows).toEqual([
      ["med-1", "avatar/acc-1/a", null],
      ["med-2", "product-photo/acc-1/b", null],
    ]);
    expect(columns(database, "media").find((entry) => entry.name === "business_id")?.notnull).toBe(
      0,
    );
    expect(foreignKeys(database, "media")).toContainEqual(
      expect.objectContaining({
        table: "businesses",
        from: "business_id",
        to: "id",
        on_delete: "NO ACTION",
      }),
    );
    expect(uniqueIndexes(database, "media")).toContainEqual(["r2_key"]);
    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("accepts one business per row and a null business for account media", () => {
    const database = new DatabaseSync(":memory:");

    apply(database, migrationFiles());
    seedAccountAndBusiness(database);

    database
      .prepare(
        `INSERT INTO media (id, owner_id, business_id, kind, r2_key, mime, size, created_at)
        VALUES ('med-3', 'acc-1', 'biz-1', 'flyer', 'media/v1/acc-1/businesses/biz-1/flyer/c.jpg', 'image/jpeg', 30, 3)`,
      )
      .run();

    const scoped = database.prepare("SELECT business_id FROM media WHERE id = 'med-3'").get();

    expect(scoped?.business_id).toBe("biz-1");
    expect(() => database.prepare("DELETE FROM businesses WHERE id = 'biz-1'").run()).toThrow(
      /FOREIGN KEY constraint failed/,
    );
    database.prepare("DELETE FROM media WHERE id = 'med-3'").run();
    database.prepare("DELETE FROM businesses WHERE id = 'biz-1'").run();
    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("rejects a duplicate object key and an unknown business", () => {
    const database = new DatabaseSync(":memory:");

    apply(database, migrationFiles());
    seedAccountAndBusiness(database);

    expect(() =>
      database
        .prepare(
          `INSERT INTO media (id, owner_id, kind, r2_key, mime, size, created_at)
          VALUES ('med-dup', 'acc-1', 'avatar', 'avatar/acc-1/a', 'image/png', 10, 4)`,
        )
        .run(),
    ).toThrow(/UNIQUE constraint failed/);
    expect(() =>
      database
        .prepare(
          `INSERT INTO media (id, owner_id, business_id, kind, r2_key, mime, size, created_at)
          VALUES ('med-orphan', 'acc-1', 'biz-missing', 'flyer', 'media/v1/acc-1/businesses/biz-missing/flyer/d.jpg', 'image/jpeg', 30, 5)`,
        )
        .run(),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  it("refuses a table that already holds duplicate object keys", () => {
    const database = new DatabaseSync(":memory:");

    apply(
      database,
      migrationFiles().filter((file) => file < targetMigration()),
    );
    seedAccountAndBusiness(database);
    database
      .prepare(
        `INSERT INTO media (id, owner_id, kind, r2_key, mime, size, created_at)
        VALUES ('med-dup', 'acc-1', 'avatar', 'avatar/acc-1/a', 'image/png', 10, 4)`,
      )
      .run();

    const before = database.prepare("SELECT COUNT(*) AS count FROM media").get()?.count;

    expect(() => apply(database, [targetMigration()])).toThrow(/UNIQUE constraint failed/);
    expect(database.prepare("SELECT COUNT(*) AS count FROM media").get()?.count).toBe(before);
  });

  it("applies to the full migration chain", () => {
    const database = new DatabaseSync(":memory:");

    apply(database, migrationFiles());

    expect(columns(database, "media").map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "id",
        "owner_id",
        "business_id",
        "kind",
        "r2_key",
        "mime",
        "size",
        "created_at",
      ]),
    );
    expect(foreignKeys(database, "media")).toContainEqual(
      expect.objectContaining({ table: "businesses", from: "business_id", on_delete: "NO ACTION" }),
    );
    expect(uniqueIndexes(database, "media")).toContainEqual(["r2_key"]);
    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
});
