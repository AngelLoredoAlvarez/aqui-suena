import { defaultConfig } from "@tamagui/config/v5";
import { createTamagui } from "tamagui";

// Canonical Tamagui configuration for Aqui Suena.
// Tokens, themes, fonts, and media come from the default preset so web
// and native share a single source of truth. Extend here (never in apps).
const tamaguiConfig = createTamagui(defaultConfig);

export type AppConfig = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
