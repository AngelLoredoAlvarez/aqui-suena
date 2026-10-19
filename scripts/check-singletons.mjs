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
import { join } from "node:path";

const SINGLETONS = [
  "@tanstack/react-query",
  "@types/react",
  "@types/react-dom",
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

function workspaceDirs() {
  const dirs = [];

  for (const group of WORKSPACE_GROUPS) {
    if (!existsSync(group)) {
      continue;
    }
    for (const entry of readdirSync(group)) {
      const dir = join(group, entry);
      if (existsSync(join(dir, "package.json"))) {
        dirs.push(dir);
      }
    }
  }

  return dirs;
}

function declaredDependencies(dir) {
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));

  return new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);
}

const dirs = workspaceDirs();
const declared = new Map(dirs.map((dir) => [dir, declaredDependencies(dir)]));
const failures = [];

for (const name of SINGLETONS) {
  const copies = new Map();

  for (const dir of dirs) {
    if (!declared.get(dir).has(name)) {
      continue;
    }

    const require = createRequire(join(process.cwd(), dir, "package.json"));

    let resolved;
    try {
      resolved = require.resolve(`${name}/package.json`);
    } catch {
      console.error(
        `check-singletons: ${name} is declared in ${dir} but does not resolve. Run pnpm install.`,
      );
      process.exit(1);
    }

    const root = realpathSync(resolved).replace(/\/package\.json$/, "");
    const importers = copies.get(root) ?? [];
    importers.push(dir);
    copies.set(root, importers);
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
