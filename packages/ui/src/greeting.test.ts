import { describe, expect, it } from "vitest";

import { greeting, placeholderMessage } from "./index";

// Characterization tests: they lock the current contract of the shared
// UI placeholder. Any NEW behavior must start with a failing (RED) test
// first, then minimal implementation (GREEN), then refactor.
describe("greeting", () => {
  it("mentions the app name", () => {
    expect(greeting()).toContain("Aqui Suena");
  });

  it("exposes the placeholder message", () => {
    expect(placeholderMessage).toBe("UI placeholder");
  });
});
