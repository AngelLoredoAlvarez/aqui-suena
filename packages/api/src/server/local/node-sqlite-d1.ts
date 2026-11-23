import type { DatabaseSync } from "node:sqlite";

type SqlValue = string | number | bigint | Uint8Array | null | boolean | undefined;
type SqlInputValue = string | number | bigint | Uint8Array | null;

function normalize(value: SqlValue): SqlInputValue {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;

  return value;
}

/**
 * Minimal D1Database adapter over node:sqlite for the local dev server.
 * Covers the subset used by the D1 repositories: prepare/bind/all/first/run.
 * Local Node has no D1 binding, so this keeps the same repository code paths.
 */
export function createNodeSqliteD1(database: DatabaseSync): D1Database {
  return {
    prepare(sql: string) {
      let parameters: SqlValue[] = [];

      const statement = {
        bind(...values: SqlValue[]) {
          parameters = values;

          return statement;
        },
        all: async () => ({
          results: database.prepare(sql).all(...parameters.map(normalize)),
          success: true,
          meta: {},
        }),
        first: async () => database.prepare(sql).get(...parameters.map(normalize)) ?? null,
        run: async () => {
          const result = database.prepare(sql).run(...parameters.map(normalize));

          return { success: true, meta: { changes: Number(result.changes) } };
        },
      };

      return statement;
    },
  } as unknown as D1Database;
}
