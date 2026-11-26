import { Bit } from "@aqui-suena/mobile/components/bit";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Ellipse, G, Path } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

const MONOSPACE = Platform.select({ ios: "Menlo", default: "monospace" });

export function FooterMark({
  footerBottom,
  footerSize,
  markSize,
  arcOpacity,
  reduceMotion,
  cursorVisible,
}: {
  footerBottom: number;
  footerSize: number;
  markSize: number;
  arcOpacity: Animated.AnimatedInterpolation<number>;
  reduceMotion: boolean;
  cursorVisible: boolean;
}) {
  return (
    <View style={[styles.by, { bottom: footerBottom }]}>
      <Text style={[styles.mono, styles.muted, { fontSize: footerSize }]}>by</Text>
      <View style={styles.markColumn}>
        <Svg width={markSize} height={markSize} viewBox="-4 -10 72 72">
          <AnimatedG opacity={arcOpacity}>
            <Path
              d="M24 6h16M26 6v20L10 54q-2 5 3 5h38q5 0 3-5L38 26V6"
              fill="none"
              stroke="#F2F5F7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
            <Path
              d="M27 40l-8 8 8 8M37 40l8 8-8 8M34 39l-4 18"
              fill="none"
              stroke="#14B8A6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3.5"
            />
          </AnimatedG>
          <G
            fill="none"
            stroke="#14B8A6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          >
            <Bit delay={0} reduceMotion={reduceMotion}>
              <Path d="M32.2 -8.5l1.6-1.1v5.2" />
            </Bit>
            <Bit delay={200} reduceMotion={reduceMotion}>
              <Ellipse cx="30.5" cy="-1" rx="1.5" ry="2.2" />
            </Bit>
            <Bit delay={400} reduceMotion={reduceMotion}>
              <Ellipse cx="33.5" cy="12.2" rx="1.5" ry="2.2" />
            </Bit>
            <Bit delay={600} reduceMotion={reduceMotion}>
              <Path d="M29.2 16.3l1.6-1.1v5.2" />
            </Bit>
            <Bit delay={800} reduceMotion={reduceMotion}>
              <Ellipse cx="33.5" cy="23.4" rx="1.5" ry="2.2" />
            </Bit>
            <Bit delay={1000} reduceMotion={reduceMotion}>
              <Path d="M29.2 27.5l1.6-1.1v5.2" />
            </Bit>
            <Bit delay={1200} reduceMotion={reduceMotion}>
              <Ellipse cx="33.5" cy="34.6" rx="1.5" ry="2.2" />
            </Bit>
          </G>
        </Svg>
        <View style={styles.wordmark}>
          <Text style={[styles.mono, styles.strong, { fontSize: footerSize }]}>17</Text>
          <Text style={[styles.mono, styles.labs, { fontSize: footerSize }]}>Labs</Text>
          <View style={[styles.cursor, { opacity: cursorVisible ? 1 : 0 }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  by: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
  },
  markColumn: {
    alignItems: "center",
    gap: 6,
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  mono: {
    fontFamily: MONOSPACE,
  },
  muted: {
    color: "#A3B3C2",
    fontWeight: "500",
  },
  strong: {
    color: "#F2F5F7",
    fontWeight: "800",
  },
  labs: {
    color: "#5EEAD4",
    fontWeight: "500",
  },
  cursor: {
    width: 8,
    height: 2,
    marginLeft: 2,
    marginBottom: 1,
    backgroundColor: "#5EEAD4",
  },
});
