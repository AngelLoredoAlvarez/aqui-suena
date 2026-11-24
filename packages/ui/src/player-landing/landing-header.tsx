import { useLocale } from "@aqui-suena/ui/i18n";
import { Icon } from "@aqui-suena/ui/shared";
import { useState } from "react";
import { Button, H1, Popover, Text, XStack, YStack } from "tamagui";

export type LandingHeaderVariant = "mobile" | "tablet" | "web";

export type LandingHeaderProps = {
  variant: LandingHeaderVariant;
  onToggleTheme?: () => void;
  onOpenAssistant?: () => void;
  onOpenMenu?: () => void;
  onOpenSearch?: () => void;
  onOpenMyBusinesses?: () => void;
};

function SearchPill({ onPress }: { onPress?: () => void }) {
  const { dictionary } = useLocale();

  return (
    <Button
      testID="landing-search"
      type="button"
      aria-label={dictionary.searchBusinessesAria}
      onPress={onPress}
      flex={1}
      minW={0}
      height={44}
      px={12}
      gap={8}
      items="center"
      justify="flex-start"
      bg="surface2"
      borderWidth={1}
      borderColor="borderColor"
      rounded={999}
    >
      <Icon name="search" size={18} tone="muted" />
      <Text
        color="muted"
        fontWeight="600"
        fontSize={14}
        numberOfLines={1}
        overflow="hidden"
        textOverflow="ellipsis"
      >
        {dictionary.searchBusinesses}
      </Text>
    </Button>
  );
}

function AssistantButton({ compact, onPress }: { compact: boolean; onPress?: () => void }) {
  const { dictionary } = useLocale();

  if (compact) {
    return (
      <Button
        testID="landing-assistant"
        type="button"
        aria-label={dictionary.assistantAria}
        onPress={onPress}
        width={44}
        height={44}
        rounded={22}
        p={0}
        bg="accent"
        items="center"
        justify="center"
      >
        <Icon name="sparkles" size={22} tone="onAccent" />
      </Button>
    );
  }

  return (
    <Button
      testID="landing-assistant"
      type="button"
      aria-label={dictionary.assistantAria}
      onPress={onPress}
      height={44}
      px={16}
      gap={8}
      items="center"
      bg="accent"
      rounded={999}
    >
      <Icon name="sparkles" size={20} tone="onAccent" />
      <Text color="onAccent" fontWeight="700" fontSize={14}>
        {dictionary.assistant}
      </Text>
    </Button>
  );
}

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
] as const;

function LanguageButton() {
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

function IconButton({
  testID,
  label,
  icon,
  onPress,
}: {
  testID: string;
  label: string;
  icon: "menu" | "sun";
  onPress?: () => void;
}) {
  return (
    <Button
      testID={testID}
      type="button"
      aria-label={label}
      onPress={onPress}
      width={44}
      height={44}
      rounded={22}
      p={0}
      bg="surface2"
      items="center"
      justify="center"
    >
      <Icon name={icon} size={22} tone="text" />
    </Button>
  );
}

export function LandingHeader({
  variant,
  onToggleTheme,
  onOpenAssistant,
  onOpenMenu,
  onOpenSearch,
  onOpenMyBusinesses,
}: LandingHeaderProps) {
  const { dictionary } = useLocale();

  if (variant === "mobile") {
    return (
      <XStack testID="landing-header" width="100%" height={48} px={12} gap={8} items="center">
        <SearchPill onPress={onOpenSearch} />
        <AssistantButton compact onPress={onOpenAssistant} />
        <LanguageButton />
        <IconButton
          testID="landing-menu"
          label={dictionary.openMenu}
          icon="menu"
          onPress={onOpenMenu}
        />
      </XStack>
    );
  }

  return (
    <XStack
      testID="landing-header"
      width="100%"
      height={variant === "web" ? 64 : 48}
      px={variant === "web" ? 24 : 12}
      items="center"
      justify="space-between"
      borderBottomWidth={variant === "web" ? 1 : 0}
      borderColor="borderColor"
    >
      <H1 color="text" fontWeight="700" fontSize={variant === "web" ? 22 : 20} m={0}>
        {dictionary.appTitle}
      </H1>
      <XStack gap={8} items="center">
        <AssistantButton compact={false} onPress={onOpenAssistant} />
        <LanguageButton />
        {variant === "web" ? (
          <IconButton
            testID="landing-theme"
            label={dictionary.changeTheme}
            icon="sun"
            onPress={onToggleTheme}
          />
        ) : null}
        {variant === "web" ? (
          <Button
            testID="landing-my-businesses"
            type="button"
            aria-label={dictionary.myBusinesses}
            onPress={onOpenMyBusinesses}
            height={44}
            px={18}
            bg="accent"
            rounded={999}
          >
            <Text color="onAccent" fontWeight="700" fontSize={14}>
              {dictionary.myBusinesses}
            </Text>
          </Button>
        ) : (
          <IconButton
            testID="landing-menu"
            label={dictionary.openMenu}
            icon="menu"
            onPress={onOpenMenu}
          />
        )}
      </XStack>
    </XStack>
  );
}
