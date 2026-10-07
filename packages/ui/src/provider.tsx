import { tamaguiConfig } from "@aqui-suena/config";
import type { ReactNode } from "react";
import { TamaguiProvider } from "tamagui";

type UiProviderProps = {
  children: ReactNode;
};

// Shared Tamagui provider for web and native. Apps wrap their root layout
// with this component so both platforms render from the same tokens,
// themes, fonts, and media defined in the canonical config.
export function UiProvider({ children }: UiProviderProps) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      {children}
    </TamaguiProvider>
  );
}
