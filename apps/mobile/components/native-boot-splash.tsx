import {
  BAR_CORNER_RADIUS,
  BAR_WIDTH,
  EQUALIZER_BARS,
  SPEAKER_CENTER_Y,
} from "@aqui-suena/mobile/components/splash-bars";
import { splashLayout } from "@aqui-suena/mobile/components/splash-layout";
import { useBootSplashAnimation } from "@aqui-suena/mobile/components/use-boot-splash-animation";
import { type ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Ellipse, G, Path, Rect } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const MONOSPACE = Platform.select({ ios: "Menlo", default: "monospace" });

type BitProps = {
  delay: number;
  reduceMotion: boolean;
  children: ReactNode;
};

function Bit({ delay, reduceMotion, children }: BitProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(0.4);

      return;
    }

    const sequence = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.timing(progress, {
          toValue: 1,
          duration: 1600,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
      ),
    ]);

    sequence.start();

    return () => sequence.stop();
  }, [delay, progress, reduceMotion]);

  const opacity = progress.interpolate({
    inputRange: [0, 0.4, 0.99, 1],
    outputRange: [0, 1, 0, 0],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 8],
  });

  return (
    <AnimatedG opacity={opacity} translateY={translateY}>
      {children}
    </AnimatedG>
  );
}

export function NativeBootSplash() {
  const { width } = useWindowDimensions();
  const { wide, logoSize, titleSize, trackWidth, trackMargin, footerBottom, footerSize, markSize } =
    splashLayout(width);
  const { reduceMotion, cursorVisible, arc, arcAlt, fill, bars } = useBootSplashAnimation();
  const [bar1, bar2, bar3] = bars;
  const [leftBar, midBar, rightBar] = EQUALIZER_BARS;
  const equalizerBars = [
    { bar: leftBar, value: bar1 },
    { bar: midBar, value: bar2 },
    { bar: rightBar, value: bar3 },
  ];

  const arcOpacity = arc.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.25, 1, 0.25],
  });

  const arcAltOpacity = arcAlt.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.25, 1, 0.25],
  });

  const fillWidth = fill.interpolate({
    inputRange: [0.05, 1],
    outputRange: [trackWidth * 0.05, trackWidth],
  });

  const barHeight = (value: Animated.Value, height: number) => Animated.multiply(value, height);

  const barY = (value: Animated.Value, height: number) =>
    Animated.subtract(SPEAKER_CENTER_Y, Animated.divide(Animated.multiply(value, height), 2));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando Aquí Suena"
      style={styles.root}
    >
      <View style={[styles.stack, { gap: wide ? 39 : 28 }]}>
        <View accessible accessibilityLabel="Logo de Aquí Suena">
          <Svg width={logoSize} height={logoSize} viewBox="87 85 850 850">
            <AnimatedPath
              d="M303.2 346.8 A265 265 0 0 0 303.2 673.2"
              fill="none"
              stroke="#FF8A65"
              strokeLinecap="round"
              strokeWidth="40"
              opacity={arcOpacity}
            />
            <AnimatedPath
              d="M720.8 346.8 A265 265 0 0 1 720.8 673.2"
              fill="none"
              stroke="#FF8A65"
              strokeLinecap="round"
              strokeWidth="40"
              opacity={arcOpacity}
            />
            <AnimatedPath
              d="M208.6 273 A385 385 0 0 0 208.6 747"
              fill="none"
              stroke="#FFC4B3"
              strokeLinecap="round"
              strokeWidth="40"
              opacity={arcAltOpacity}
            />
            <AnimatedPath
              d="M815.4 273 A385 385 0 0 1 815.4 747"
              fill="none"
              stroke="#FFC4B3"
              strokeLinecap="round"
              strokeWidth="40"
              opacity={arcAltOpacity}
            />
            <G transform="translate(512 510) scale(1.1) translate(-512 -510)">
              <Path
                d="M400 300 H624 L672 400 a40 40 0 0 1 -80 0 a40 40 0 0 1 -80 0 a40 40 0 0 1 -80 0 a40 40 0 0 1 -80 0 Z"
                fill="#FF8A65"
              />
              <Rect x="380" y="475" width="264" height="245" rx="24" fill="#FF8A65" />
              <G fill="#0F1720">
                {equalizerBars.map(({ bar, value }) => (
                  <AnimatedRect
                    key={bar.x}
                    x={bar.x}
                    width={BAR_WIDTH}
                    rx={BAR_CORNER_RADIUS}
                    height={barHeight(value, bar.height)}
                    y={barY(value, bar.height)}
                  />
                ))}
              </G>
            </G>
          </Svg>
        </View>
        <Text
          style={[
            styles.title,
            {
              fontFamily: "PlusJakartaSans_700Bold",
              fontSize: titleSize,
              lineHeight: titleSize * 1.2,
            },
          ]}
        >
          Aquí Suena
        </Text>
        <View
          style={[styles.track, { width: trackWidth, marginTop: trackMargin }]}
          accessibilityRole="progressbar"
          accessibilityLabel="Cargando"
        >
          <Animated.View style={[styles.fill, { width: reduceMotion ? "40%" : fillWidth }]} />
        </View>
      </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F1720",
  },
  stack: {
    alignItems: "center",
  },
  title: {
    color: "#F2F5F7",
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  track: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#2C3E52",
    overflow: "hidden",
  },
  fill: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#FF8A65",
  },
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
