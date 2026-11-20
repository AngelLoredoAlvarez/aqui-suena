import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { apply, migrationFiles, statements } from "./support.mjs";

const SWEEP_INDEXES = {
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

function parseCreatedIndex(statement) {
  const match = statement.match(/^CREATE INDEX `([^`]+)` ON `([^`]+)` \(([^)]+)\);$/);

  if (match === null) {
    throw new Error(`not a CREATE INDEX statement: ${statement}`);
  }

  return {
    name: match[1],
    table: match[2],
    columns: match[3].split(",").map((column) => column.trim().replaceAll("`", "")),
  };
}

describe("migration 0012", () => {
  it("creates exactly the seven requested indexes with no data change", () => {
    const created = statements("0012_lowly_sinister_six.sql");

    expect(created).toHaveLength(7);
    for (const statement of created) {
      expect(statement).toMatch(/^CREATE INDEX `/);
      expect(statement).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE TABLE)\b/i);
    }

    const actual = Object.fromEntries(
      created.map((statement) => {
        const parsed = parseCreatedIndex(statement);

        return [parsed.name, { table: parsed.table, columns: parsed.columns }];
      }),
    );

    expect(actual).toEqual(SWEEP_INDEXES);
  });

  it("applies the migration chain with those indexes and columns", () => {
    const database = new DatabaseSync(":memory:");

    apply(database, migrationFiles());

    for (const [name, expected] of Object.entries(SWEEP_INDEXES)) {
      const row = database
        .prepare("SELECT tbl_name FROM sqlite_master WHERE type = 'index' AND name = ?")
        .get(name);

      expect(row?.tbl_name).toBe(expected.table);

      const columns = database
        .prepare("SELECT name FROM pragma_index_info(?) ORDER BY seqno")
        .all(name)
        .map((column) => column.name);

      expect(columns).toEqual(expected.columns);
    }
  });
});
