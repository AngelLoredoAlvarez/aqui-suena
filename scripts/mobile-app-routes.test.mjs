// Expo Router bundles every file under apps/mobile/app as a route. A test file
// there imports vitest, which pulls vite/module-runner into the Metro bundle
// and breaks the native build, so tests must stay outside the route directory.
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = join(ROOT, "apps", "mobile", "app");
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

test("apps/mobile/app contains no test files", () => {
  const offenders = listFiles(APP_DIR)
    .filter((path) => TEST_FILE.test(path))
    .map((path) => relative(ROOT, path));

  assert.deepEqual(
    offenders,
    [],
    `Move these files outside the Expo Router app directory: ${offenders.join(", ")}`,
  );
});
