import { defaultConfig } from "@tamagui/config/v5";
import { createTamagui } from "tamagui";
import { describe, expect, it } from "vitest";
import tamaguiConfig from "../tamagui.config";

// Baseline: the untouched preset processed the same way, so Variable
// wrapping cannot mask an edit to an existing token group.
const baseline = createTamagui(defaultConfig);

type TokenValue = { readonly val: unknown };

function colorVal(name: string): unknown {
  const token = (tamaguiConfig.tokens.color as Record<string, TokenValue>)[name];
  return token?.val;
}

// Brand identity tokens: additive night-plum surface ramp, warm amber
// accent, and cream text. Existing preset tokens must stay untouched.
describe("brand tokens", () => {
  it("exposes the night-plum surface ramp", () => {
    expect(colorVal("brand1")).toBe("#150e22");
    expect(colorVal("brand2")).toBe("#1e1430");
    expect(colorVal("brand3")).toBe("#2a1c42");
    expect(colorVal("brand4")).toBe("#3a2857");
    expect(colorVal("brand5")).toBe("#4e3a6e");
    expect(colorVal("brand6")).toBe("#665085");
  });

  it("exposes the warm amber accent and cream text", () => {
    expect(colorVal("brandAccent")).toBe("#e9a13b");
    expect(colorVal("brandAccentHover")).toBe("#f2b45c");
    expect(colorVal("brandAccentPress")).toBe("#c77f22");
    expect(colorVal("brandCream")).toBe("#f8f1de");
    expect(colorVal("brandCreamMuted")).toBe("#cdbfa4");
  });

  it("exposes semantic status colors for the player status dot", () => {
    expect(colorVal("brandSuccess")).toBe("#3dd68c");
    expect(colorVal("brandDanger")).toBe("#e5484d");
  });

  it("leaves every existing preset token group untouched", () => {
    expect(tamaguiConfig.tokens.space).toEqual(baseline.tokens.space);
    expect(tamaguiConfig.tokens.size).toEqual(baseline.tokens.size);
    expect(tamaguiConfig.tokens.radius).toEqual(baseline.tokens.radius);
    expect(tamaguiConfig.tokens.zIndex).toEqual(baseline.tokens.zIndex);
  });
});
