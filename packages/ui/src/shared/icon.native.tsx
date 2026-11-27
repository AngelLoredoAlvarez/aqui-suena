import type { IconName, IconTone } from "@aqui-suena/ui/shared/icon-names";
import type { ReactNode } from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "tamagui";

const shapes: Record<IconName, ReactNode> = {
  search: (
    <>
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-4-4" />
    </>
  ),
  sparkles: <Path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />,
  globe: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>
  ),
  sun: (
    <>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
    </>
  ),
  menu: <Path d="M4 7h16M4 12h16M4 17h16" />,
  "chevron-down": <Path d="M6 9l6 6 6-6" />,
  "chevron-left": <Path d="M15 6l-6 6 6 6" />,
  "chevron-right": <Path d="M9 6l6 6-6 6" />,
  "arrow-right": <Path d="M5 12h14M13 6l6 6-6 6" />,
  store: (
    <Path d="M4 9l1-5h14l1 5M4 9v11h16V9M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 6 0 2.5 2.5 0 0 0 5 0M10 20v-6h4v6" />
  ),
  home: (
    <>
      <Path d="M3 10.5L12 3l9 7.5" />
      <Path d="M5 9.5V21h14V9.5" />
      <Path d="M9 21v-6h6v6" />
    </>
  ),
  check: <Path d="M5 12l5 5 9-10" />,
  x: <Path d="M6 6l12 12M18 6L6 18" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  minus: <Path d="M5 12h14" />,
  reset: (
    <>
      <Path d="M3 12a9 9 0 1 0 3-6.7" />
      <Path d="M3 4v5h5" />
    </>
  ),
  download: (
    <>
      <Path d="M12 3v12" />
      <Path d="M7 10l5 5 5-5" />
      <Path d="M5 21h14" />
    </>
  ),
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
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {shapes[name]}
    </Svg>
  );
}
