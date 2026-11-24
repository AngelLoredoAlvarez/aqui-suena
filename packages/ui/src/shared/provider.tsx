import { tamaguiConfig } from "@aqui-suena/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { TamaguiProvider, Theme } from "tamagui";

type UiProviderProps = {
  children: ReactNode;
  queryClient?: QueryClient;
};

export function UiProvider({ children, queryClient }: UiProviderProps) {
  const [fallbackClient] = useState(() => new QueryClient());
  const client = queryClient ?? fallbackClient;

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <Theme name="noche">
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </Theme>
    </TamaguiProvider>
  );
}
