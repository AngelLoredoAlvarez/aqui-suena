import { Button, XStack } from "tamagui";

import { useLocale } from "./locale-context";

// Minimal shared locale switcher: two buttons, Tamagui primitives only,
// no router. Rendered on the landing so the manual choice is one tap away
// on both platforms. Must live inside <LocaleProvider>.
export function LocaleSwitcher() {
  const { locale, onChange } = useLocale();
  return (
    <XStack gap="2">
      <Button
        type="button"
        size="xs"
        rounded={5}
        fontSize="2"
        fontWeight="400"
        opacity={1}
        disabled={locale === "es"}
        onPress={() => onChange("es")}
      >
        Español
      </Button>
      <Button
        type="button"
        size="xs"
        rounded={5}
        fontSize="2"
        fontWeight="400"
        opacity={1}
        disabled={locale === "en"}
        onPress={() => onChange("en")}
      >
        English
      </Button>
    </XStack>
  );
}
