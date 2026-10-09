import { appName } from "@aqui-suena/config";

export const placeholderMessage = "UI placeholder";

export function greeting(): string {
  return `Hello from ${appName} UI placeholder`;
}

export { AdsCarousel } from "./ads-carousel";
export type { LocaleContextValue, LocaleProviderProps } from "./i18n/locale-context";
export { LocaleProvider, useLocale } from "./i18n/locale-context";
export type { LocaleStore } from "./i18n/locale-env";
export {
  detectNativeLocale,
  detectWebLocale,
  LOCALE_STORAGE_KEY,
  loadPersistedLocale,
  savePersistedLocale,
} from "./i18n/locale-env";
export { LocaleSwitcher } from "./i18n/locale-switcher";
export type { Dictionary, SupportedLocale } from "./i18n/locales";
export { defaultLocale, en, es, getDictionary, resolveLocale } from "./i18n/locales";
export { useListenerStatus } from "./listener-status";
export type { PlayerCardProps, PlayerCardStatus, StationRef } from "./player-card";
export { PlayerCard } from "./player-card";
export { PlayerLanding } from "./player-landing";
export { UiProvider } from "./provider";
export { SharedButton } from "./shared-button";
