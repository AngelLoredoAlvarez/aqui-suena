import { playerSpacing } from "@aqui-suena/ui/player-landing/player-spacing";
import { describe, expect, it } from "vitest";

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
