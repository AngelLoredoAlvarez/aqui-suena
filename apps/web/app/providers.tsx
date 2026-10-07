"use client";

import { UiProvider } from "@aqui/ui";
import type { ReactNode } from "react";

type ProvidersProps = {
  children: ReactNode;
};

// Client boundary for shared providers. The Tamagui provider itself lives
// in shared code (@aqui/ui) so web and native use the same setup.
export function Providers({ children }: ProvidersProps) {
  return <UiProvider>{children}</UiProvider>;
}
