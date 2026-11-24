"use client";

import {
  defaultLocale,
  detectWebLocale,
  LocaleProvider,
  loadPersistedLocale,
  type SupportedLocale,
  savePersistedLocale,
  UiProvider,
} from "@aqui-suena/ui";
import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

type ProvidersProps = {
  children: ReactNode;
};

const queryClient = new QueryClient();

// Client boundary for shared providers. The Tamagui provider itself lives
// in shared code (@aqui-suena/ui) so web and native use the same setup.
// Locale state starts at the default and resolves persisted-then-detected
// in an effect: reading localStorage during render would break SSR
// hydration, so the first paint uses `es` and the resolved locale applies
// on mount. The manual choice persists in localStorage across reloads.
export function Providers({ children }: ProvidersProps) {
  const [locale, setLocale] = useState<SupportedLocale>(defaultLocale);

  useEffect(() => {
    setLocale(loadPersistedLocale(window.localStorage) ?? detectWebLocale());
  }, []);

  const handleChange = useCallback((next: SupportedLocale) => {
    setLocale(next);
    savePersistedLocale(window.localStorage, next);
  }, []);

  return (
    <UiProvider queryClient={queryClient}>
      <LocaleProvider locale={locale} onChange={handleChange}>
        {children}
      </LocaleProvider>
    </UiProvider>
  );
}
