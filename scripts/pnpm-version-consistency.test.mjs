// Regression probe for the package-manager pin. pnpm's version is recorded in
// three places (package.json, README.md and the lockfile's
// packageManagerDependencies) and drifting one of them breaks installs or
// frozen-lockfile CI runs, so this test fails when they disagree.
// Run with: node --test scripts/pnpm-version-consistency.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(ROOT, file), "utf8");

function pinnedVersion() {
  const manifest = JSON.parse(read("package.json"));
  const match = /^pnpm@(\d+\.\d+\.\d+)$/.exec(manifest.packageManager ?? "");

  assert.ok(match, `packageManager must be an exact pnpm version, got ${manifest.packageManager}`);

  return match[1];
}

test("the README states the pnpm version pinned in package.json", () => {
  const version = pinnedVersion();
  const escaped = version.replaceAll(".", "\\.");

  assert.match(read("README.md"), new RegExp(`pnpm ${escaped}(?![\\d.])`));
});

test("the lockfile records the pnpm version pinned in package.json", () => {
  const version = pinnedVersion();
  const escaped = version.replaceAll(".", "\\.");

  assert.match(
    read("pnpm-lock.yaml"),
    new RegExp(
      `packageManagerDependencies:\\n\\s+pnpm:\\n\\s+specifier: ${escaped}\\n\\s+version: ${escaped}`,
    ),
  );
});
