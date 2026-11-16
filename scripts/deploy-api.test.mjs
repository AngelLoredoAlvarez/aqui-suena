import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bookmarkFromOutput, deployPlan, parseArgs } from "./deploy-api.mjs";

describe("parseArgs", () => {
  it("defaults to staging", () => {
    const args = parseArgs(["node", "script"]);

    assert.equal(args.environment, "staging");
    assert.equal(args.dryRun, false);
    assert.equal(args.yes, false);
  });

  it("reads the environment and the flags", () => {
    const args = parseArgs(["node", "script", "--env", "production", "--yes", "--dry-run"]);

    assert.equal(args.environment, "production");
    assert.equal(args.yes, true);
    assert.equal(args.dryRun, true);
  });

  it("rejects an unknown environment", () => {
    assert.throws(() => parseArgs(["node", "script", "--env", "prod"]), /unknown environment/);
  });
});

describe("bookmarkFromOutput", () => {
  it("extracts the bookmark from wrangler output", () => {
    const output =
      "The current bookmark is '0000001f-00000006-00005125-cd1507eeba25c96409a6990e3ddd7dd2'";

    assert.equal(
      bookmarkFromOutput(output),
      "0000001f-00000006-00005125-cd1507eeba25c96409a6990e3ddd7dd2",
    );
  });

  it("returns null when no bookmark is present", () => {
    assert.equal(bookmarkFromOutput("no bookmark here"), null);
  });
});

describe("deployPlan", () => {
  it("runs bookmark, migrations, then deploy for staging", () => {
    const steps = deployPlan("staging");

    assert.deepEqual(
      steps.map((step) => step.label),
      ["bookmark", "migrate", "deploy"],
    );
    assert.deepEqual(steps[1].args, [
      "d1",
      "migrations",
      "apply",
      "aqui-suena-db-staging",
      "--remote",
      "--env",
      "staging",
    ]);
  });

  it("targets the production database without the staging flag", () => {
    const steps = deployPlan("production");

    assert.deepEqual(steps[1].args, ["d1", "migrations", "apply", "aqui-suena-db", "--remote"]);
    assert.deepEqual(steps[2].args, ["deploy"]);
  });
});
