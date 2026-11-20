import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = join(ROOT, "packages", "db", "migrations");

const EXPECTED = {
  businesses_account_idx: { table: "businesses", columns: ["account_id"] },
  cfdi_invoices_status_updated_idx: { table: "cfdi_invoices", columns: ["status", "updated_at"] },
  payments_status_created_idx: { table: "payments", columns: ["status", "created_at"] },
  payments_subscription_created_idx: {
    table: "payments",
    columns: ["subscription_id", "created_at"],
  },
  subscriptions_status_ends_idx: { table: "subscriptions", columns: ["status", "ends_at"] },
  subscriptions_status_grace_idx: { table: "subscriptions", columns: ["status", "grace_end"] },
  subscriptions_account_status_idx: { table: "subscriptions", columns: ["account_id", "status"] },
};

function statements(file) {
  return readFileSync(join(MIGRATIONS, file), "utf8")
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function parseCreatedIndex(statement) {
  const match = statement.match(/^CREATE INDEX `([^`]+)` ON `([^`]+)` \(([^)]+)\);$/);

  assert.notEqual(match, null, `not a CREATE INDEX statement: ${statement}`);

  return {
    name: match[1],
    table: match[2],
    columns: match[3].split(",").map((column) => column.trim().replaceAll("`", "")),
  };
}

test("0012 creates exactly the seven requested indexes with no data change", () => {
  const created = statements("0012_lowly_sinister_six.sql");

  assert.equal(created.length, 7);
  for (const statement of created) {
    assert.match(statement, /^CREATE INDEX `/);
    assert.doesNotMatch(statement, /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE TABLE)\b/i);
  }

  const actual = Object.fromEntries(
    created.map((statement) => {
      const parsed = parseCreatedIndex(statement);

      return [parsed.name, { table: parsed.table, columns: parsed.columns }];
    }),
  );

  assert.deepEqual(actual, EXPECTED);
});

test("applying the migration chain creates those indexes with those columns", () => {
  const database = new DatabaseSync(":memory:");
  const files = readdirSync(MIGRATIONS)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    for (const statement of statements(file)) {
      database.exec(statement);
    }
  }

  for (const [name, expected] of Object.entries(EXPECTED)) {
    const row = database
      .prepare("SELECT tbl_name FROM sqlite_master WHERE type = 'index' AND name = ?")
      .get(name);

    assert.equal(row?.tbl_name, expected.table);
    const columns = database
      .prepare("SELECT name FROM pragma_index_info(?) ORDER BY seqno")
      .all(name)
      .map((column) => column.name);

    assert.deepEqual(columns, expected.columns);
  }
});
