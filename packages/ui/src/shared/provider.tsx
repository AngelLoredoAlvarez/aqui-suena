import { tamaguiConfig } from "@aqui-suena/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { TamaguiProvider, Theme } from "tamagui";

type UiProviderProps = {
  children: ReactNode;
};

// Shared Tamagui provider for web and native. Apps wrap their root layout
// with this component so both platforms render from the same tokens,
// themes, fonts, and media defined in the canonical config.
//
// The QueryClientProvider lives here too: shared UI components (PlayerLanding,
// PlayerCard, ...) call useQuery/useMutation through useListenerStatus and
// useAdsCarousel. Providing the client at this level guarantees those hooks
// always have a client even when an app forgets to wrap its tree, which is
// what produced the "No QueryClient set" runtime error on mobile.
const queryClient = new QueryClient();

export function UiProvider({ children }: UiProviderProps) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <Theme name="noche">
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </Theme>
    </TamaguiProvider>
  );
}
