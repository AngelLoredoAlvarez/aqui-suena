// Runs the EAS CLI from the app directory with the two lifecycle scripts that
// pnpm 12 blocks by default. EAS commands must run from apps/mobile in this
// monorepo, so the wrapper pins that working directory and works from any cwd.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mobileDir = resolve(repoRoot, "apps/mobile");

const result = spawnSync(
  "pnpm",
  [
    "dlx",
    "--allow-build=dtrace-provider",
    "--allow-build=protobufjs",
    "eas-cli@latest",
    ...process.argv.slice(2),
  ],
  {
    cwd: mobileDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.error) {
  console.error(`error: could not run pnpm: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
