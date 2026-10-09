import { resolveLocale, type SupportedLocale } from "./locales";

// Platform boundary helpers. Detection input is injected (never read from a
// global the shared package cannot see in tests): the web boundary passes
// navigator.language, the native boundary passes expo-localization's
// getLocales()[0]?.languageTag. Persistence takes a minimal sync store so
// web can pass localStorage while native passes its best-available store.
// Mocks live only at these boundaries, never inside Card/Landing.

export const LOCALE_STORAGE_KEY = "aqui-suena.locale";

export type LocaleStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function detectWebLocale(language?: string): SupportedLocale {
  const tag = language ?? (typeof navigator !== "undefined" ? navigator.language : undefined);
  return resolveLocale(tag);
}

export function detectNativeLocale(languageTag?: string): SupportedLocale {
  return resolveLocale(languageTag);
}

export function loadPersistedLocale(store?: LocaleStore): SupportedLocale | undefined {
  try {
    const raw = store?.getItem(LOCALE_STORAGE_KEY);
    return raw === "es" || raw === "en" ? raw : undefined;
  } catch {
    return undefined;
  }
}

export function savePersistedLocale(store: LocaleStore | undefined, locale: SupportedLocale): void {
  try {
    store?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Persistence is best-effort: a denied store must never break playback.
  }
}
