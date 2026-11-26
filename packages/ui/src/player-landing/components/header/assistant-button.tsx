import { useLocale } from "@aqui-suena/ui/i18n";
import { Icon } from "@aqui-suena/ui/shared";
import { Button, Text } from "tamagui";

export function AssistantButton({ compact, onPress }: { compact: boolean; onPress?: () => void }) {
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
