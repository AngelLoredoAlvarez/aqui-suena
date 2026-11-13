// Probes for the Infisical wrapper. Importing the module must stay side-effect
// free: it only spawns when maybeReexecUnderInfisical() is called.
import assert from "node:assert/strict";
import { test } from "node:test";
import { infisicalAuthHint, isInfisicalAuthFailure } from "./with-infisical.mjs";

test("detects an expired session", () => {
  const output = [
    'error: failed to fetch secrets for path "/": CallGetRawSecretsV3 Unsuccessful response',
    "[status-code=401]",
    '[message="Your session is no longer valid, please re-authenticate"]',
  ].join("\n");

  assert.equal(isInfisicalAuthFailure(output), true);
});

test("detects a missing secret fetch and an invalid service token", () => {
  assert.equal(isInfisicalAuthFailure("Could not fetch secrets"), true);
  assert.equal(isInfisicalAuthFailure("Invalid service token supplied"), true);
});

test("ignores output from a successful run", () => {
  assert.equal(isInfisicalAuthFailure("api: listening on http://0.0.0.0:3001"), false);
  assert.equal(isInfisicalAuthFailure(""), false);
});

test("the hint tells the user to log in without leaking identifiers", () => {
  const hint = infisicalAuthHint();

  assert.match(hint, /pnpm exec infisical login/);
  assert.doesNotMatch(hint, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i);
  assert.doesNotMatch(hint, /token=/i);
  assert.doesNotMatch(hint, /Bearer/i);
});
