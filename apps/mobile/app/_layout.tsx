import {
  type AsyncLocaleStore,
  detectNativeLocale,
  LocaleProvider,
  loadPersistedLocaleAsync,
  type SupportedLocale,
  savePersistedLocaleAsync,
  UiProvider,
} from "@aqui-suena/ui";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getLocales } from "expo-localization";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";

const queryClient = new QueryClient();

// Device persistence: the manual choice survives app reloads in AsyncStorage.
const deviceStore: AsyncLocaleStore = AsyncStorage;

function initialNativeLocale(): SupportedLocale {
  return detectNativeLocale(getLocales()[0]?.languageTag);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const [locale, setLocale] = useState<SupportedLocale>(initialNativeLocale);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const persisted = await loadPersistedLocaleAsync(deviceStore);
        if (active && persisted) {
          setLocale(persisted);
        }
      } catch {
        // Keep the detected default: storage errors must never break boot.
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, []);

  const handleChange = useCallback((next: SupportedLocale) => {
    setLocale(next);
    void savePersistedLocaleAsync(deviceStore, next);
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <UiProvider>
      <LocaleProvider locale={locale} onChange={handleChange}>
        <QueryClientProvider client={queryClient}>
          {/* Screen backdrop mirrors $nocheBg, same as web body style. */}
          <Stack screenOptions={{ contentStyle: { backgroundColor: "#0F1720" } }} />
        </QueryClientProvider>
      </LocaleProvider>
    </UiProvider>
  );
}
