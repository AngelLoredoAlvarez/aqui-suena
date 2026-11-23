import { DatabaseSync } from "node:sqlite";
import { createNodeSqliteD1 } from "@aqui-suena/api/server/local/node-sqlite-d1";
import { describe, expect, it } from "vitest";

describe("createNodeSqliteD1", () => {
  it("runs bound statements and returns rows through the D1 subset", async () => {
    const database = new DatabaseSync(":memory:");
    database.exec("CREATE TABLE items (id TEXT PRIMARY KEY, label TEXT NOT NULL)");
    const db = createNodeSqliteD1(database);

    const inserted = await db
      .prepare("INSERT INTO items (id, label) VALUES (?, ?)")
      .bind("a", "Alpha")
      .run();

    expect(inserted.success).toBe(true);
    expect(inserted.meta?.changes).toBe(1);

    const rows = await db.prepare("SELECT id, label FROM items").all();

    expect(rows.results).toEqual([{ id: "a", label: "Alpha" }]);

    const first = await db.prepare("SELECT label FROM items WHERE id = ?").bind("a").first();
    const missing = await db
      .prepare("SELECT label FROM items WHERE id = ?")
      .bind("missing")
      .first();

    expect(first).toEqual({ label: "Alpha" });
    expect(missing).toBeNull();
  });

  it("normalizes booleans and undefined to SQLite values", async () => {
    const database = new DatabaseSync(":memory:");
    database.exec("CREATE TABLE flags (id TEXT PRIMARY KEY, enabled INTEGER, note TEXT)");
    const db = createNodeSqliteD1(database);

    await db
      .prepare("INSERT INTO flags (id, enabled, note) VALUES (?, ?, ?)")
      .bind("a", true, undefined)
      .run();

    const row = await db.prepare("SELECT enabled, note FROM flags WHERE id = ?").bind("a").first();

    expect(row).toEqual({ enabled: 1, note: null });
  });
});
