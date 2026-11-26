import { useLocale } from "@aqui-suena/ui/i18n";
import { Icon } from "@aqui-suena/ui/shared";
import { useState } from "react";
import { Button, Popover, Text, YStack } from "tamagui";

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
] as const;

export function LanguageButton() {
  const { locale, onChange, dictionary } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} placement="bottom-end" offset={8} zIndex={1000}>
      <Popover.Trigger asChild>
        <Button
          testID="landing-language"
          type="button"
          aria-label={dictionary.changeLanguage}
          aria-haspopup="menu"
          aria-expanded={open}
          height={44}
          px={12}
          gap={6}
          items="center"
          bg="surface2"
          rounded={999}
        >
          <Icon name="globe" size={20} tone="text" />
          <Text color="text" fontWeight="700" fontSize={14}>
            {locale.toUpperCase()}
          </Text>
          <Icon name="chevron-down" size={14} tone="muted" />
        </Button>
      </Popover.Trigger>
      <Popover.Content
        role="menu"
        aria-label={dictionary.changeLanguage}
        bg="surface"
        borderWidth={1}
        borderColor="borderColor"
        rounded={12}
        p={4}
      >
        <YStack testID="landing-language-menu" gap={2} items="stretch">
          {LANGUAGES.map((language) => (
            <Button
              key={language.value}
              testID={`landing-language-${language.value}`}
              type="button"
              role="menuitem"
              aria-checked={locale === language.value}
              onPress={() => {
                onChange(language.value);
                setOpen(false);
              }}
              height={36}
              px={8}
              rounded={8}
              bg={locale === language.value ? "surface2" : "transparent"}
              justify="space-between"
              gap={8}
            >
              <Text color="text" fontWeight="600" fontSize={14}>
                {language.label}
              </Text>
              {locale === language.value ? <Icon name="check" size={16} tone="accent" /> : null}
            </Button>
          ))}
        </YStack>
      </Popover.Content>
    </Popover>
  );
}
