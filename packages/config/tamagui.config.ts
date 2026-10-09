import { defaultConfig } from "@tamagui/config/v5";
import { createTamagui } from "tamagui";

// Canonical Tamagui configuration for Aqui Suena.
// Tokens, themes, fonts, and media come from the default preset so web
// and native share a single source of truth. Extend here (never in apps).
//
// Brand palette (additive only: no preset token is edited). The default
// preset ships no color token group, so `brand` adds one, following the
// preset's numeric-ramp pattern (ascending lightness, like space/size):
// night-plum surfaces brand1 (deepest) to brand6 (lightest), a warm amber
// accent with hover/press states, and cream text with a muted variant.
// brandSuccess/brandDanger are the player status-dot colors (green playing,
// red error); they live here because Tamagui style props only accept tokens,
// not arbitrary hex values under strict TS.
const brand = {
  brand1: "#150e22",
  brand2: "#1e1430",
  brand3: "#2a1c42",
  brand4: "#3a2857",
  brand5: "#4e3a6e",
  brand6: "#665085",
  brandAccent: "#e9a13b",
  brandAccentHover: "#f2b45c",
  brandAccentPress: "#c77f22",
  brandCream: "#f8f1de",
  brandCreamMuted: "#cdbfa4",
  brandSuccess: "#3dd68c",
  brandDanger: "#e5484d",
} as const;

const tamaguiConfig = createTamagui({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    color: brand,
  },
});

export type AppConfig = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
