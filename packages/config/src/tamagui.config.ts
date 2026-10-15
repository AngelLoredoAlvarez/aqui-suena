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

const nocheBrasa = {
  nocheBg: "#0F1720",
  nocheSurface: "#172230",
  nocheSurface2: "#1F2D3E",
  nocheBorder: "#2C3E52",
  nocheText: "#F2F5F7",
  nocheMuted: "#A3B3C2",
  nocheAccent: "#FF8A65",
  nocheOnAccent: "#1A1008",
  nocheOk: "#3CCFA8",
  nocheError: "#FF6B6B",
  brasaBg: "#F6F3EE",
  brasaSurface: "#FFFFFF",
  brasaSurface2: "#EDE8E0",
  brasaBorder: "#DDD5C9",
  brasaText: "#1B2430",
  brasaMuted: "#566170",
  brasaAccent: "#C8431D",
  brasaOnAccent: "#FFFFFF",
  brasaOk: "#0B7A63",
  brasaError: "#C62F3A",
} as const;

// Theme alias layer (additive: default preset themes stay untouched).
// Components will speak generic names ($surface, $text…); each theme
// decides what those mean. Hexes live once in nocheBrasa — these objects
// only reference them, never copy them.
const nocheTheme = {
  bg: nocheBrasa.nocheBg,
  surface: nocheBrasa.nocheSurface,
  surface2: nocheBrasa.nocheSurface2,
  border: nocheBrasa.nocheBorder,
  text: nocheBrasa.nocheText,
  muted: nocheBrasa.nocheMuted,
  accent: nocheBrasa.nocheAccent,
  onAccent: nocheBrasa.nocheOnAccent,
  ok: nocheBrasa.nocheOk,
  error: nocheBrasa.nocheError,
} as const;

const brasaTheme = {
  bg: nocheBrasa.brasaBg,
  surface: nocheBrasa.brasaSurface,
  surface2: nocheBrasa.brasaSurface2,
  border: nocheBrasa.brasaBorder,
  text: nocheBrasa.brasaText,
  muted: nocheBrasa.brasaMuted,
  accent: nocheBrasa.brasaAccent,
  onAccent: nocheBrasa.brasaOnAccent,
  ok: nocheBrasa.brasaOk,
  error: nocheBrasa.brasaError,
} as const;

const tamaguiConfig = createTamagui({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    color: {
      ...brand,
      ...nocheBrasa,
    },
  },
  themes: {
    ...defaultConfig.themes,
    noche: nocheTheme,
    brasa: brasaTheme,
  },
});

export type AppConfig = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
