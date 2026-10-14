import { describe, expect, it } from "vitest";

import { describeMediaError } from "./errors";

// Slice (b): media-error mapper. Contract under test: autoplay rejection
// becomes `blocked`, source-not-supported (code 4) becomes an error, and
// each maps to a dictionary key — never a hardcoded string. Copy lives in
// @aqui-suena/ui dictionaries so both locales stay in sync; the player
// package only decides status + key.
describe("describeMediaError", () => {
  it("maps autoplay rejection to blocked with a resume key", () => {
    expect(describeMediaError({ name: "NotAllowedError" })).toEqual({
      status: "blocked",
      messageKey: "tapToEnableSound",
    });
  });

  it("maps source-not-supported to a mirror key", () => {
    expect(describeMediaError({ code: 4 })).toEqual({
      status: "error",
      messageKey: "signalUnavailable",
    });
  });

  it("prefers blocked when autoplay was rejected on a broken source", () => {
    expect(describeMediaError({ name: "NotAllowedError", code: 4 })).toEqual({
      status: "blocked",
      messageKey: "tapToEnableSound",
    });
  });

  it("maps unknown failures to a generic error key", () => {
    expect(describeMediaError({})).toEqual({
      status: "error",
      messageKey: "playbackFailed",
    });
  });
});
