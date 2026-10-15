import { defaultConfig } from "@tamagui/config/v5";
import { createTamagui } from "tamagui";
import { describe, expect, it } from "vitest";
import tamaguiConfig from "./tamagui.config";

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

describe("noche/brasa theme pairs", () => {
  it("exposes Noche dark tokens", () => {
    expect(colorVal("nocheBg")).toBe("#0F1720");
    expect(colorVal("nocheSurface")).toBe("#172230");
    expect(colorVal("nocheSurface2")).toBe("#1F2D3E");
    expect(colorVal("nocheBorder")).toBe("#2C3E52");
    expect(colorVal("nocheText")).toBe("#F2F5F7");
    expect(colorVal("nocheMuted")).toBe("#A3B3C2");
    expect(colorVal("nocheAccent")).toBe("#FF8A65");
    expect(colorVal("nocheOnAccent")).toBe("#1A1008");
    expect(colorVal("nocheOk")).toBe("#3CCFA8");
    expect(colorVal("nocheError")).toBe("#FF6B6B");
  });

  it("exposes Brasa light tokens", () => {
    expect(colorVal("brasaBg")).toBe("#F6F3EE");
    expect(colorVal("brasaSurface")).toBe("#FFFFFF");
    expect(colorVal("brasaSurface2")).toBe("#EDE8E0");
    expect(colorVal("brasaBorder")).toBe("#DDD5C9");
    expect(colorVal("brasaText")).toBe("#1B2430");
    expect(colorVal("brasaMuted")).toBe("#566170");
    expect(colorVal("brasaAccent")).toBe("#C8431D");
    expect(colorVal("brasaOnAccent")).toBe("#FFFFFF");
    expect(colorVal("brasaOk")).toBe("#0B7A63");
    expect(colorVal("brasaError")).toBe("#C62F3A");
  });
});

describe("noche/brasa themes", () => {
  const themeVal = (theme: string, name: string): unknown => {
    const group = (tamaguiConfig.themes as Record<string, Record<string, TokenValue>>)[theme];
    return group?.[name]?.val;
  };

  it("maps generic tokens to Noche dark values", () => {
    expect(themeVal("noche", "bg")).toBe("#0F1720");
    expect(themeVal("noche", "surface")).toBe("#172230");
    expect(themeVal("noche", "surface2")).toBe("#1F2D3E");
    expect(themeVal("noche", "borderColor")).toBe("#2C3E52");
    expect(themeVal("noche", "text")).toBe("#F2F5F7");
    expect(themeVal("noche", "muted")).toBe("#A3B3C2");
    expect(themeVal("noche", "accent")).toBe("#FF8A65");
    expect(themeVal("noche", "onAccent")).toBe("#1A1008");
    expect(themeVal("noche", "ok")).toBe("#3CCFA8");
    expect(themeVal("noche", "error")).toBe("#FF6B6B");
  });

  it("maps generic tokens to Brasa light values", () => {
    expect(themeVal("brasa", "bg")).toBe("#F6F3EE");
    expect(themeVal("brasa", "surface")).toBe("#FFFFFF");
    expect(themeVal("brasa", "surface2")).toBe("#EDE8E0");
    expect(themeVal("brasa", "borderColor")).toBe("#DDD5C9");
    expect(themeVal("brasa", "text")).toBe("#1B2430");
    expect(themeVal("brasa", "muted")).toBe("#566170");
    expect(themeVal("brasa", "accent")).toBe("#C8431D");
    expect(themeVal("brasa", "onAccent")).toBe("#FFFFFF");
    expect(themeVal("brasa", "ok")).toBe("#0B7A63");
    expect(themeVal("brasa", "error")).toBe("#C62F3A");
  });

  it("keeps every default theme token inside noche and brasa", () => {
    // Keys we deliberately re-theme: our alias layer wins over the base.
    // Everything else must survive untouched.
    const rethemed = new Set([
      "bg",
      "surface",
      "surface2",
      "borderColor",
      "text",
      "muted",
      "accent",
      "onAccent",
      "ok",
      "error",
    ]);
    const baselineDark = baseline.themes.dark as Record<string, TokenValue>;
    const baselineLight = baseline.themes.light as Record<string, TokenValue>;

    for (const name of Object.keys(baselineDark)) {
      if (rethemed.has(name)) {
        continue;
      }
      expect(themeVal("noche", name)).toBe(baselineDark[name]?.val);
    }

    for (const name of Object.keys(baselineLight)) {
      if (rethemed.has(name)) {
        continue;
      }
      expect(themeVal("brasa", name)).toBe(baselineLight[name]?.val);
    }
  });

  it("shares generic keys across light/dark and brasa/noche", () => {
    const names = [
      "bg",
      "surface",
      "surface2",
      "borderColor",
      "text",
      "muted",
      "accent",
      "onAccent",
      "ok",
      "error",
    ];

    for (const name of names) {
      expect(themeVal("light", name)).toBe(themeVal("brasa", name));
      expect(themeVal("dark", name)).toBe(themeVal("noche", name));
    }
  });
});
