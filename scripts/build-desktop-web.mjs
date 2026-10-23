// Builds the web app as a static export for the Tauri bundle.
//
// Cross-platform on purpose: the desktop package calls this through pnpm, so
// the build mode travels as an env var instead of `FOO=1 cmd` shell syntax,
// which does not exist on Windows.
import { spawnSync } from "node:child_process";

const DEFAULT_API_BASE_URL = "http://localhost:3001";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  console.warn(
    `warning: NEXT_PUBLIC_API_BASE_URL is unset, baking ${DEFAULT_API_BASE_URL}.\n` +
      "         A packaged app pointing at localhost is a development artifact, not a release.",
  );
}

const result = spawnSync("pnpm", ["--filter", "web", "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    STATIC_EXPORT: "1",
    NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
  },
  // pnpm is a .cmd shim on Windows.
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
