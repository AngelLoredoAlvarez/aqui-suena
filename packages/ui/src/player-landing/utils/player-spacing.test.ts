import {
  contentTopPadding,
  landingTopPadding,
  playerSpacing,
} from "@aqui-suena/ui/player-landing/utils/player-spacing";
import { describe, expect, it } from "vitest";

describe("contentTopPadding", () => {
  it("uses 12 below web and 20 on web", () => {
    expect(contentTopPadding(false)).toBe(12);
    expect(contentTopPadding(true)).toBe(20);
  });
});

describe("landingTopPadding", () => {
  it("matches the dock margin on top and the content gap below", () => {
    expect(landingTopPadding("top", false)).toBe(12);
    expect(landingTopPadding("top", true)).toBe(12);
    expect(landingTopPadding("bottom", false)).toBe(12);
    expect(landingTopPadding("bottom", true)).toBe(20);
  });
});

describe("playerSpacing", () => {
  it("keeps the original spacing without native insets", () => {
    expect(playerSpacing(false, { top: 0, bottom: 0 })).toEqual({
      paddingTop: 20,
      paddingBottom: 8,
    });
    expect(playerSpacing(true, { top: 0, bottom: 0 })).toEqual({
      paddingTop: 24,
      paddingBottom: 24,
    });
  });

  it("adds the native top and bottom insets", () => {
    expect(playerSpacing(false, { top: 24, bottom: 48 })).toEqual({
      paddingTop: 44,
      paddingBottom: 56,
    });
  });
});
