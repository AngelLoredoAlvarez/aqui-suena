import { Button, Text } from "tamagui";

export type Filter = "all" | "open" | "delivery" | `category:${string}`;

export function FilterChip({
  filter,
  label,
  selected,
  onSelect,
}: {
  filter: Filter;
  label: string;
  selected: boolean;
  onSelect: (filter: Filter) => void;
}) {
  return (
    <Button
      testID={`landing-filter-${filter}`}
      type="button"
      aria-pressed={selected}
      onPress={() => onSelect(filter)}
      minH={44}
      px={16}
      rounded={999}
      bg={selected ? "accent" : "surface2"}
      borderWidth={1}
      borderColor={selected ? "accent" : "borderColor"}
    >
      <Text color={selected ? "onAccent" : "text"} fontWeight="600" fontSize={14} numberOfLines={1}>
        {label}
      </Text>
    </Button>
  );
}
