#!/usr/bin/env node
// Fails when a context-carrying package resolves to more than one physical copy.
//
// pnpm materializes one directory per resolved peer set under node_modules/.pnpm,
// and type-only peers count: two @types/react versions fork the runtime module into
// two module registries, so a React provider and its consumer stop sharing a
// context ("No QueryClient set" is the classic symptom).
//
// The check resolves each singleton from every workspace package that declares it,
// because what matters is the resolution graph, not leftover directories on disk
// that nothing points at. Keep SINGLETONS aligned with the catalog in
// pnpm-workspace.yaml.
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const SINGLETONS = [
  "@tanstack/react-query",
  "@types/react",
  "@types/react-dom",
  "expo-audio",
  "jotai",
  "react",
  "react-dom",
  "react-native",
  "react-native-gesture-handler",
  "react-native-reanimated",
  "react-native-safe-area-context",
  "react-native-screens",
  "tamagui",
];

const WORKSPACE_GROUPS = ["apps", "packages"];

// Resolve the workspace root instead of trusting cwd: run from a subdirectory and
// a relative scan would find nothing and report a false "ok".
function findWorkspaceRoot(start) {
  let dir = start;

  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

function workspaceDirs(root) {
  const dirs = [];

  for (const group of WORKSPACE_GROUPS) {
    const groupDir = join(root, group);
    if (!existsSync(groupDir)) {
      continue;
    }
    for (const entry of readdirSync(groupDir)) {
      const dir = join(group, entry);
      if (existsSync(join(root, dir, "package.json"))) {
        dirs.push(dir);
      }
    }
  }

  return dirs;
}

function declaredDependencies(root, dir) {
  const manifest = JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8"));

  return new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);
}

const root = findWorkspaceRoot(process.cwd());

if (!root) {
  console.error("check-singletons: pnpm-workspace.yaml not found above the current directory.");
  process.exit(1);
}

const dirs = workspaceDirs(root);

if (dirs.length === 0) {
  console.error(`check-singletons: no workspace packages found in ${root}.`);
  process.exit(1);
}

const declared = new Map(dirs.map((dir) => [dir, declaredDependencies(root, dir)]));
const failures = [];

for (const name of SINGLETONS) {
  const copies = new Map();

  for (const dir of dirs) {
    if (!declared.get(dir).has(name)) {
      continue;
    }

    const require = createRequire(join(root, dir, "package.json"));

    let resolved;
    try {
      resolved = require.resolve(`${name}/package.json`);
    } catch {
      console.error(
        `check-singletons: ${name} is declared in ${dir} but does not resolve. Run pnpm install.`,
      );
      process.exit(1);
    }

    const copy = realpathSync(resolved).replace(/\/package\.json$/, "");
    const importers = copies.get(copy) ?? [];
    importers.push(dir);
    copies.set(copy, importers);
  }

  if (copies.size > 1) {
    failures.push({ name, copies });
  }
}

if (failures.length > 0) {
  for (const { name, copies } of failures) {
    console.error(`x ${name}: ${copies.size} physical copies`);
    for (const [copy, importers] of copies) {
      console.error(`    ${copy}`);
      console.error(`      <- ${importers.join(", ")}`);
    }
  }
  console.error("");
  console.error("Run `pnpm why <package>` to find who pulls the extra copy.");
  console.error("Fix it in the catalog of pnpm-workspace.yaml, never by hand-pinning.");
  process.exit(1);
}

console.log(`ok: ${SINGLETONS.length} singletons, one physical copy each`);
