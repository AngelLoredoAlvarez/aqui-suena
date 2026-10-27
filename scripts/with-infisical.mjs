// Re-executes the current script under Infisical when available, so secrets are
// injected without a .env file. No-op when infisical is missing, in CI, when
// the repo is not linked to an Infisical project, or when the environment is
// already populated (e.g. running under `infisical run` or with manual env vars).
//
// Exposed as a function instead of running on import, so importing a script to
// test its helpers never re-execs the whole process.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function findInfisical() {
  const candidates = [path.join(repoRoot, "node_modules", ".bin", "infisical")];
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    candidates.push(path.join(dir, "infisical"));
  }
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

export function maybeReexecUnderInfisical() {
  const alreadyWrapped = process.env.INFISICAL_RUN === "1";
  const inCi = !!process.env.CI;
  const linked = existsSync(path.join(repoRoot, ".infisical.yaml"));
  const envPopulated =
    !!process.env.DATABASE_URL ||
    !!process.env.EXPO_PUBLIC_API_BASE_URL ||
    !!process.env.NEXT_PUBLIC_API_BASE_URL ||
    !!process.env.API_ORIGIN;

  const bin = findInfisical();

  if (bin && !alreadyWrapped && !inCi && linked && !envPopulated) {
    const result = spawnSync(bin, ["run", "--", "node", ...process.argv.slice(1)], {
      stdio: "inherit",
      env: { ...process.env, INFISICAL_RUN: "1" },
      cwd: process.cwd(),
    });
    process.exit(result.status ?? 1);
  }
}
