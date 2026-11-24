import type { ReactNode } from "react";
import { useTheme } from "tamagui";

export type IconName =
  | "search"
  | "sparkles"
  | "globe"
  | "sun"
  | "menu"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "arrow-right"
  | "store"
  | "check";

export type IconTone = "text" | "muted" | "accent" | "onAccent" | "ok" | "error";

const shapes: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx={11} cy={11} r={7} />
      <path d="M20 20l-4-4" />
    </>
  ),
  sparkles: <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />,
  globe: (
    <>
      <circle cx={12} cy={12} r={9} />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>
  ),
  sun: (
    <>
      <circle cx={12} cy={12} r={4} />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  "chevron-left": <path d="M15 6l-6 6 6 6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  store: (
    <path d="M4 9l1-5h14l1 5M4 9v11h16V9M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 6 0 2.5 2.5 0 0 0 5 0M10 20v-6h4v6" />
  ),
  check: <path d="M5 12l5 5 9-10" />,
};

export function Icon({
  name,
  size = 20,
  tone = "text",
}: {
  name: IconName;
  size?: number;
  tone?: IconTone;
}) {
  const theme = useTheme();
  const value = (theme as Record<string, { val?: string } | undefined>)[tone]?.val;
  const color = value ?? theme.text?.val ?? "#000";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name]}
    </svg>
  );
}
