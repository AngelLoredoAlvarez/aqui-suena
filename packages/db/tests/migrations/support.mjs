import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const MIGRATIONS = fileURLToPath(new URL("../../migrations", import.meta.url));

export function statements(file) {
  return readFileSync(join(MIGRATIONS, file), "utf8")
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export function migrationFiles() {
  return readdirSync(MIGRATIONS)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

export function apply(database, files) {
  for (const file of files) {
    for (const statement of statements(file)) {
      database.exec(statement);
    }
  }
}
