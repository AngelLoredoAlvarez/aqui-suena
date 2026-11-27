import Svg, { G, Path, Rect } from "react-native-svg";

export type BrandMarkProps = {
  readonly size?: number;
  readonly testID?: string;
};

export function BrandMark({ size = 32, testID }: BrandMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="87 85 850 850" testID={testID} aria-hidden>
      <G fill="none">
        <Path
          d="M303.2 346.8 A265 265 0 0 0 303.2 673.2"
          stroke="#FF8A65"
          strokeLinecap="round"
          strokeWidth={40}
        />
        <Path
          d="M720.8 346.8 A265 265 0 0 1 720.8 673.2"
          stroke="#FF8A65"
          strokeLinecap="round"
          strokeWidth={40}
        />
        <Path
          d="M208.6 273 A385 385 0 0 0 208.6 747"
          stroke="#FFC4B3"
          strokeLinecap="round"
          strokeWidth={40}
        />
        <Path
          d="M815.4 273 A385 385 0 0 1 815.4 747"
          stroke="#FFC4B3"
          strokeLinecap="round"
          strokeWidth={40}
        />
      </G>
      <G transform="translate(512 510) scale(1.1) translate(-512 -510)">
        <Path
          d="M400 300 H624 L672 400 a40 40 0 0 1 -80 0 a40 40 0 0 1 -80 0 a40 40 0 0 1 -80 0 a40 40 0 0 1 -80 0 Z"
          fill="#FF8A65"
        />
        <Rect x={380} y={475} width={264} height={245} rx={24} fill="#FF8A65" />
        <G fill="#0F1720">
          <Rect x={442} y={552} width={36} height={90} rx={18} />
          <Rect x={494} y={522} width={36} height={150} rx={18} />
          <Rect x={546} y={542} width={36} height={110} rx={18} />
        </G>
      </G>
    </Svg>
  );
}
