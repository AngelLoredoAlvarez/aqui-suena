// Captures a D1 bookmark, applies pending migrations and deploys the API Worker.
//
// Production needs an explicit `--yes` flag: the script is meant to run in CI
// behind a protected environment, but a human running it locally should not
// reach production by accident.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ENVIRONMENTS = {
  staging: {
    database: "aqui-suena-db-staging",
    wranglerArgs: ["--env", "staging"],
  },
  production: {
    database: "aqui-suena-db",
    wranglerArgs: [],
  },
};

const BOOKMARK_PATTERN = /([0-9a-f]{8}(?:-[0-9a-f]{8}){2}-[0-9a-f]{32})/;

export function parseArgs(argv) {
  const args = argv.slice(2);
  const envIndex = args.indexOf("--env");
  const requested = envIndex === -1 ? "staging" : args[envIndex + 1];

  if (!(requested in ENVIRONMENTS)) {
    throw new Error(`unknown environment: ${String(requested)} (use staging or production)`);
  }

  return {
    environment: requested,
    dryRun: args.includes("--dry-run"),
    yes: args.includes("--yes"),
  };
}

/** Extracts the bookmark from `wrangler d1 time-travel info` output. */
export function bookmarkFromOutput(output) {
  const match = output.match(BOOKMARK_PATTERN);

  return match ? match[1] : null;
}

/** Ordered wrangler commands for one environment; the deploy is always last. */
export function deployPlan(environment) {
  const target = ENVIRONMENTS[environment];
  const envArgs = target.wranglerArgs;

  return [
    {
      label: "bookmark",
      args: ["d1", "time-travel", "info", target.database, ...envArgs],
    },
    {
      label: "migrate",
      args: ["d1", "migrations", "apply", target.database, "--remote", ...envArgs],
    },
    {
      label: "deploy",
      args: ["deploy", ...envArgs],
    },
  ];
}

function runWrangler(args, { capture = false } = {}) {
  const result = spawnSync("pnpm", ["exec", "wrangler", ...args], {
    cwd: resolve(dirname(fileURLToPath(import.meta.url)), "..", "packages", "api"),
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });

  if (capture) {
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

    process.stdout.write(output);
  }

  return result;
}

export function main(argv = process.argv) {
  const { environment, dryRun, yes } = parseArgs(argv);
  const target = ENVIRONMENTS[environment];
  const plan = deployPlan(environment);

  console.log(`deploy-api: environment=${environment} database=${target.database}`);

  if (environment === "production" && !yes) {
    console.error("deploy-api: production requires --yes (or a protected CI environment).");
    return 2;
  }

  if (dryRun) {
    for (const step of plan) {
      console.log(`[dry-run] wrangler ${step.args.join(" ")}`);
    }
    return 0;
  }

  const bookmarkStep = runWrangler(plan[0].args, { capture: true });
  const bookmark = bookmarkFromOutput(`${bookmarkStep.stdout ?? ""}${bookmarkStep.stderr ?? ""}`);

  if (bookmark === null) {
    console.warn("deploy-api: could not read a bookmark; continuing without a rollback point.");
  } else {
    console.log(`deploy-api: rollback bookmark ${bookmark}`);
  }

  const migrate = runWrangler(plan[1].args);

  if (migrate.status !== 0) {
    console.error("deploy-api: migrations failed; the Worker was not deployed.");
    return migrate.status ?? 1;
  }

  const deploy = runWrangler(plan[2].args);

  if (deploy.status !== 0) {
    console.error("deploy-api: deploy failed.");
    return deploy.status ?? 1;
  }

  console.log(`deploy-api: deployed ${environment}.`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
