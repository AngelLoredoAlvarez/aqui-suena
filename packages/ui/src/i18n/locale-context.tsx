import { createContext, type ReactNode, useContext, useMemo } from "react";

import { type Dictionary, getDictionary, type SupportedLocale } from "./locales";

export type LocaleContextValue = {
  readonly locale: SupportedLocale;
  readonly dictionary: Dictionary;
  readonly onChange: (locale: SupportedLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export type LocaleProviderProps = {
  readonly locale: SupportedLocale;
  readonly onChange: (locale: SupportedLocale) => void;
  readonly children: ReactNode;
};

// Shared locale state. The provider is controlled: each app boundary owns
// detection (navigator.language on web, expo-localization on native) and
// persistence, then passes the resolved locale plus onChange down. Card and
// Landing only read, never detect.
export function LocaleProvider({ locale, onChange, children }: LocaleProviderProps) {
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dictionary: getDictionary(locale), onChange }),
    [locale, onChange],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocale must be used inside <LocaleProvider>");
  }
  return value;
}
