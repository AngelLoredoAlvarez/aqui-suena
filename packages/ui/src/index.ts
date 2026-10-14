import { appName } from "@aqui-suena/config";

export const placeholderMessage = "UI placeholder";

export function greeting(): string {
  return `Hello from ${appName} UI placeholder`;
}

export { AdsCarousel } from "./ads-carousel/ads-carousel";
export type { LocaleContextValue, LocaleProviderProps } from "./i18n/locale-context";
export { LocaleProvider, useLocale } from "./i18n/locale-context";
export type { AsyncLocaleStore, LocaleStore } from "./i18n/locale-env";
export {
  detectNativeLocale,
  detectWebLocale,
  LOCALE_STORAGE_KEY,
  loadPersistedLocale,
  loadPersistedLocaleAsync,
  savePersistedLocale,
  savePersistedLocaleAsync,
} from "./i18n/locale-env";
export { LocaleSwitcher } from "./i18n/locale-switcher";
export type { Dictionary, SupportedLocale } from "./i18n/locales";
export { defaultLocale, en, es, getDictionary, resolveLocale } from "./i18n/locales";
export type { PlayerCardProps, PlayerCardStatus, StationRef } from "./player-card/player-card";
export { PlayerCard } from "./player-card/player-card";
export { useListenerStatus } from "./player-landing/listener-status";
export { PlayerLanding } from "./player-landing/player-landing";
export { UiProvider } from "./shared/provider";
export { SharedButton } from "./shared/shared-button";
