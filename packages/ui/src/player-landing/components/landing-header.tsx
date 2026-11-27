import { useLocale } from "@aqui-suena/ui/i18n";
import { AssistantButton } from "@aqui-suena/ui/player-landing/components/header/assistant-button";
import { BrandMark } from "@aqui-suena/ui/player-landing/components/header/brand-mark";
import { IconButton } from "@aqui-suena/ui/player-landing/components/header/icon-button";
import { LanguageButton } from "@aqui-suena/ui/player-landing/components/header/language-button";
import { SearchPill } from "@aqui-suena/ui/player-landing/components/search-pill";
import { Button, H1, Text, XStack } from "tamagui";

export type LandingHeaderVariant = "mobile" | "tablet" | "web";

export type LandingHeaderProps = {
  variant: LandingHeaderVariant;
  onToggleTheme?: () => void;
  onOpenAssistant?: () => void;
  onOpenMenu?: () => void;
  onOpenSearch?: () => void;
  onOpenMyBusinesses?: () => void;
};

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
        <SearchPill size="sm" onPress={onOpenSearch} />
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
      <XStack items="center" gap={variant === "web" ? 10 : 8}>
        <BrandMark size={variant === "web" ? 32 : 26} testID="landing-brand-mark" />
        <H1 color="text" fontWeight="700" fontSize={variant === "web" ? 22 : 20} m={0}>
          {dictionary.appTitle}
        </H1>
      </XStack>
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
