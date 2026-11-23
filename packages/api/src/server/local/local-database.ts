import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { DEFAULT_PLAN_CATALOG, seedPlans } from "@aqui-suena/api/domain/plans/catalog";
import { D1PlanCatalogWriter } from "@aqui-suena/api/infrastructure/plans/d1-plan-catalog-writer";
import {
  createD1Repositories,
  type DirectoryRepositories,
} from "@aqui-suena/api/server/composition/repositories";
import { createNodeSqliteD1 } from "@aqui-suena/api/server/local/node-sqlite-d1";

export const LOCAL_MIGRATIONS_DIR = fileURLToPath(
  new URL("../../../../db/migrations", import.meta.url).href,
);

const MIGRATIONS_TABLE = "__local_migrations";

export type LocalDatabase = {
  readonly database: DatabaseSync;
  readonly repositories: DirectoryRepositories;
  readonly appliedMigrations: readonly string[];
  close(): void;
};

type MigrationRow = { name: string };

function splitStatements(file: string): string[] {
  return readFileSync(file, "utf8")
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

/**
 * Applies pending SQL migrations in filename order and records each applied
 * file. A database with tables but no tracking table is refused instead of
 * guessing how far an older manual schema got.
 */
export function applyLocalMigrations(
  database: DatabaseSync,
  migrationsDir: string = LOCAL_MIGRATIONS_DIR,
): string[] {
  const tracked = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(MIGRATIONS_TABLE);

  if (tracked === undefined) {
    const existing = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1",
      )
      .get();

    if (existing !== undefined) {
      throw new Error(
        "Local database has tables but no migration tracking. Remove the local database and restart.",
      );
    }
  }

  database.exec(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (name TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL)`,
  );

  const applied = new Set(
    (database.prepare(`SELECT name FROM ${MIGRATIONS_TABLE}`).all() as MigrationRow[]).map(
      (row) => row.name,
    ),
  );
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const newlyApplied: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;

    for (const statement of splitStatements(join(migrationsDir, file))) {
      database.exec(statement);
    }

    database
      .prepare(`INSERT INTO ${MIGRATIONS_TABLE} (name, applied_at) VALUES (?, ?)`)
      .run(file, Date.now());
    newlyApplied.push(file);
  }

  return newlyApplied;
}

/**
 * Opens the local SQLite database, applies migrations, seeds the plan catalog
 * and builds the D1 repositories. The path may be `:memory:` for tests.
 */
export async function openLocalDatabase(path: string): Promise<LocalDatabase> {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const database = new DatabaseSync(path);

  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA foreign_keys = ON");

  const appliedMigrations = applyLocalMigrations(database);
  const d1 = createNodeSqliteD1(database);

  await seedPlans(new D1PlanCatalogWriter(d1), DEFAULT_PLAN_CATALOG);

  return {
    database,
    repositories: createD1Repositories(d1),
    appliedMigrations,
    close: () => database.close(),
  };
}
