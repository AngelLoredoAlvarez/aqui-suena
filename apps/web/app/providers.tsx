"use client";

import { UiProvider } from "@aqui-suena/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

type ProvidersProps = {
  children: ReactNode;
};

const queryClient = new QueryClient();

// Client boundary for shared providers. The Tamagui provider itself lives
// in shared code (@aqui-suena/ui) so web and native use the same setup.
// The query client is created per app bundle (mock-first: no SSR caching
// concerns yet; revisit when the HTTP transport lands).
export function Providers({ children }: ProvidersProps) {
  return (
    <UiProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </UiProvider>
  );
}
