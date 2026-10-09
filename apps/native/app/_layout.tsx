import {
  detectNativeLocale,
  LocaleProvider,
  type LocaleStore,
  loadPersistedLocale,
  type SupportedLocale,
  savePersistedLocale,
  UiProvider,
} from "@aqui-suena/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getLocales } from "expo-localization";
import { Stack } from "expo-router";
import { useCallback, useState } from "react";

const queryClient = new QueryClient();

// Best-available persistence: no AsyncStorage yet, so the manual choice
// survives for the app session only. Follow-up: install
// @react-native-async-storage/async-storage and pass it here.
const backing = new Map<string, string>();
const sessionStore: LocaleStore = {
  getItem: (key) => backing.get(key) ?? null,
  setItem: (key, value) => {
    backing.set(key, value);
  },
};

function initialNativeLocale(): SupportedLocale {
  return loadPersistedLocale(sessionStore) ?? detectNativeLocale(getLocales()[0]?.languageTag);
}

export default function RootLayout() {
  const [locale, setLocale] = useState<SupportedLocale>(initialNativeLocale);

  const handleChange = useCallback((next: SupportedLocale) => {
    setLocale(next);
    savePersistedLocale(sessionStore, next);
  }, []);

  return (
    <UiProvider>
      <LocaleProvider locale={locale} onChange={handleChange}>
        <QueryClientProvider client={queryClient}>
          <Stack />
        </QueryClientProvider>
      </LocaleProvider>
    </UiProvider>
  );
}
