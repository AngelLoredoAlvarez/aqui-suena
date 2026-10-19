// Regression probes for scripts/check-singletons.mjs, the guard behind the
// single-version policy in pnpm-workspace.yaml. A guard that always prints "ok"
// looks identical to a healthy tree, so these tests prove it fails when it must.
// Run with: node --test scripts/check-singletons.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = join(ROOT, "scripts", "check-singletons.mjs");
const TMP = mkdtempSync(join(tmpdir(), "singletons-probe-"));

after(() => rmSync(TMP, { recursive: true, force: true }));

// Mirrors the layout the guard walks: a workspace root marker, one package per
// singleton vault, and symlinks that emulate pnpm's virtual store.
function makeWorkspace(name, packages) {
  const root = join(TMP, name);
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "pnpm-workspace.yaml"), 'packages:\n  - "apps/*"\n');

  for (const pkg of packages) {
    mkdirSync(join(root, "apps", pkg, "node_modules"), { recursive: true });
    writeFileSync(
      join(root, "apps", pkg, "package.json"),
      JSON.stringify({ name: pkg, dependencies: { react: "19.2.3" } }),
    );
  }

  return root;
}

function makeVendor(root, vendor) {
  const dir = join(root, "vendor", vendor);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "react", version: "19.2.3" }));

  return dir;
}

function link(root, pkg, vendor) {
  symlinkSync(`../../../vendor/${vendor}`, join(root, "apps", pkg, "node_modules", "react"));
}

function runGuard(cwd) {
  return spawnSync(process.execPath, [GUARD], { cwd, encoding: "utf8" });
}

test("this repository resolves every declared singleton to one physical copy", () => {
  const result = runGuard(ROOT);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ok: \d+ singletons, one physical copy each/);
});

test("accepts two packages sharing one physical copy", () => {
  const root = makeWorkspace("shared", ["a", "b"]);
  makeVendor(root, "react");
  link(root, "a", "react");
  link(root, "b", "react");

  const result = runGuard(root);

  assert.equal(result.status, 0, result.stderr);
});

test("rejects two physical copies of a declared singleton", () => {
  const root = makeWorkspace("forked", ["a", "b"]);
  makeVendor(root, "react-a");
  makeVendor(root, "react-b");
  link(root, "a", "react-a");
  link(root, "b", "react-b");

  const result = runGuard(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /x react: 2 physical copies/);
  assert.match(result.stderr, /<- apps\/a/);
  assert.match(result.stderr, /<- apps\/b/);
});

test("fails when a declared singleton does not resolve", () => {
  const root = makeWorkspace("unresolved", ["a"]);

  const result = runGuard(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /react is declared in apps\/a but does not resolve/);
});

test("ignores stale store directories that nothing resolves to", () => {
  const root = makeWorkspace("stale", ["a"]);
  makeVendor(root, "react");
  link(root, "a", "react");

  const stale = join(root, "node_modules", ".pnpm", "react@0.0.1", "node_modules", "react");
  mkdirSync(stale, { recursive: true });
  writeFileSync(join(stale, "package.json"), JSON.stringify({ name: "react", version: "0.0.1" }));

  const result = runGuard(root);

  assert.equal(result.status, 0, result.stderr);
});

test("still checks when invoked from a subdirectory instead of a false ok", () => {
  const root = makeWorkspace("subdir", ["a", "b"]);
  makeVendor(root, "react-a");
  makeVendor(root, "react-b");
  link(root, "a", "react-a");
  link(root, "b", "react-b");

  const result = runGuard(join(root, "apps", "a"));

  assert.equal(result.status, 1);
  assert.match(result.stderr, /x react: 2 physical copies/);
});

test("fails outside a workspace root", () => {
  const outside = join(TMP, "outside");
  mkdirSync(outside, { recursive: true });

  const result = runGuard(outside);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /pnpm-workspace\.yaml not found/);
});

test("pre-commit runs the guard before typecheck and test", () => {
  const lines = readFileSync(join(ROOT, ".husky", "pre-commit"), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const guard = lines.indexOf("pnpm check:singletons");
  assert.ok(guard >= 0, "guard missing from pre-commit");
  assert.ok(guard < lines.indexOf("pnpm typecheck"), "guard must run before typecheck");
  assert.ok(guard < lines.indexOf("pnpm test"), "guard must run before test");
});
