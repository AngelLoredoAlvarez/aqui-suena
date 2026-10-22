// Builds the web app as a static export and deploys it to Cloudflare Pages.
//
// Cross-platform on purpose: the build mode and the Worker URL travel as env
// vars instead of `FOO=1 cmd` shell syntax, which does not exist on Windows.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PROJECT = "aqui-suena-web";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const projectName = process.env.PAGES_PROJECT ?? DEFAULT_PROJECT;

if (!apiBaseUrl) {
  console.error(
    "error: NEXT_PUBLIC_API_BASE_URL is required (the deployed Worker URL).\n" +
      "       example: NEXT_PUBLIC_API_BASE_URL=https://aqui-suena-api.<subdomain>.workers.dev pnpm deploy:web",
  );
  process.exit(1);
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const build = spawnSync("pnpm", ["--filter", "web", "build"], {
  cwd: repoRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    STATIC_EXPORT: "1",
    NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
  },
  shell: process.platform === "win32",
});
if (build.status !== 0) process.exit(build.status ?? 1);

const deploy = spawnSync(
  "wrangler",
  [
    "pages",
    "deploy",
    resolve(repoRoot, "apps/web/out"),
    "--project-name",
    projectName,
    "--branch",
    "main",
  ],
  {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);
if (deploy.status !== 0) process.exit(deploy.status ?? 1);

console.log(
  `\nCloudflare Pages origin: https://${projectName}.pages.dev\n` +
    "If that URL differs, update ALLOWED_ORIGINS in packages/api/wrangler.toml and redeploy the Worker.",
);
