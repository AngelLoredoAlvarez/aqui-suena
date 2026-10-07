import { UiProvider } from "@aqui/ui";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <UiProvider>
      <Stack />
    </UiProvider>
  );
}
