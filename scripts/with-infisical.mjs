// Re-executes the current script under Infisical when available, so secrets are
// injected without a .env file. No-op when infisical is missing, in CI, when the
// repo is not linked to an Infisical project, or when the environment is already
// populated (e.g. running under `infisical run` or with manual env vars).
//
// Exposed as a function instead of running on import, so importing a script to
// test its helpers never re-execs the whole process.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTH_TAIL_LENGTH = 8_192;

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

const AUTH_FAILURE_MARKERS = [
  "status-code=401",
  "session is no longer valid",
  "could not fetch secrets",
  "invalid service token",
];

export function isInfisicalAuthFailure(output) {
  const normalized = String(output ?? "").toLowerCase();

  return AUTH_FAILURE_MARKERS.some((marker) => normalized.includes(marker));
}

export function infisicalAuthHint() {
  return [
    "[infisical] could not fetch secrets: the session may have expired or the service token may be invalid.",
    "[infisical] Run `pnpm exec infisical login`, then retry.",
  ].join("\n");
}

function runUnderInfisical(bin) {
  return new Promise(() => {
    const child = spawn(bin, ["run", "--", "node", ...process.argv.slice(1)], {
      stdio: ["inherit", "pipe", "pipe"],
      env: { ...process.env, INFISICAL_RUN: "1" },
      cwd: process.cwd(),
    });

    // Only a bounded tail is kept, in memory, for failure classification. It is
    // never written to disk and never printed; child output is forwarded as-is.
    let tail = "";
    const forward = (chunk, target) => {
      target.write(chunk);
      tail = (tail + chunk.toString()).slice(-AUTH_TAIL_LENGTH);
    };

    child.stdout.on("data", (chunk) => forward(chunk, process.stdout));
    child.stderr.on("data", (chunk) => forward(chunk, process.stderr));

    child.on("error", (error) => {
      console.error(`[infisical] could not start the CLI: ${error.message}`);
      process.exit(1);
    });

    child.on("close", (code) => {
      if (isInfisicalAuthFailure(tail)) {
        console.error(infisicalAuthHint());
      }

      process.exit(code ?? 1);
    });
  });
}

export function maybeReexecUnderInfisical() {
  const alreadyWrapped = process.env.INFISICAL_RUN === "1";
  const inCi = !!process.env.CI;
  const linked = existsSync(path.join(repoRoot, ".infisical.yaml"));
  const envPopulated =
    !!process.env.SUPABASE_URL ||
    !!process.env.EXPO_PUBLIC_API_BASE_URL ||
    !!process.env.NEXT_PUBLIC_API_BASE_URL ||
    !!process.env.API_ORIGIN;

  const bin = findInfisical();

  if (bin && !alreadyWrapped && !inCi && linked && !envPopulated) {
    return runUnderInfisical(bin);
  }

  return Promise.resolve(false);
}
