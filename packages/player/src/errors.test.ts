import { describe, expect, it } from "vitest";

import { describeMediaError } from "./errors";

// Slice (b): media-error mapper. Contract under test: autoplay rejection
// becomes `blocked` with a resume message, source-not-supported (code 4)
// becomes a mirror message, anything else a generic error.
describe("describeMediaError", () => {
  it("maps autoplay rejection to blocked with a resume message", () => {
    expect(describeMediaError({ name: "NotAllowedError" })).toEqual({
      status: "blocked",
      message: "Autoplay was blocked. Tap to enable sound.",
    });
  });

  it("maps source-not-supported to a mirror message", () => {
    expect(describeMediaError({ code: 4 })).toEqual({
      status: "error",
      message: "Signal unavailable, trying mirror…",
    });
  });

  it("prefers blocked when autoplay was rejected on a broken source", () => {
    expect(describeMediaError({ name: "NotAllowedError", code: 4 })).toEqual({
      status: "blocked",
      message: "Autoplay was blocked. Tap to enable sound.",
    });
  });

  it("maps unknown failures to a generic error", () => {
    expect(describeMediaError({})).toEqual({
      status: "error",
      message: "Playback failed.",
    });
  });
});
