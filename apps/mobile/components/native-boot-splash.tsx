import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
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
  const wide = width >= 600;
  const logoSize = wide ? 196 : 140;
  const titleSize = wide ? 48 : 34;
  const trackWidth = wide ? 176 : 126;
  const trackMargin = wide ? 29 : 21;
  const footerBottom = wide ? 48 : 40;
  const footerSize = wide ? 17 : 15;
  const markSize = wide ? 38 : 32;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const arc = useRef(new Animated.Value(0)).current;
  const arcAlt = useRef(new Animated.Value(0)).current;
  const fill = useRef(new Animated.Value(0.05)).current;
  const bar1 = useRef(new Animated.Value(0.55)).current;
  const bar2 = useRef(new Animated.Value(0.55)).current;
  const bar3 = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      arc.setValue(0.4);
      arcAlt.setValue(0.4);
      fill.setValue(0.4);
      bar1.setValue(1);
      bar2.setValue(1);
      bar3.setValue(1);

      return;
    }

    const arcLoop = Animated.loop(
      Animated.timing(arc, {
        toValue: 1,
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    );

    const arcAltLoop = Animated.sequence([
      Animated.delay(350),
      Animated.loop(
        Animated.timing(arcAlt, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ),
    ]);

    const fillLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(fill, {
          toValue: 1,
          duration: 1920,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.delay(480),
      ]),
    );

    const bars = [bar1, bar2, bar3].map((value, index) =>
      Animated.sequence([
        Animated.delay(index * 200),
        Animated.loop(
          Animated.sequence([
            Animated.timing(value, {
              toValue: 1,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
            Animated.timing(value, {
              toValue: 0.55,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
          ]),
        ),
      ]),
    );

    const animations = [arcLoop, arcAltLoop, fillLoop, ...bars];

    animations.forEach((animation) => {
      animation.start();
    });

    return () => {
      animations.forEach((animation) => {
        animation.stop();
      });
    };
  }, [arc, arcAlt, bar1, bar2, bar3, fill, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      setCursorVisible(true);

      return;
    }

    const timer = setInterval(() => {
      setCursorVisible((visible) => !visible);
    }, 500);

    return () => clearInterval(timer);
  }, [reduceMotion]);

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
    Animated.subtract(597, Animated.divide(Animated.multiply(value, height), 2));

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
                <AnimatedRect
                  x="442"
                  width="36"
                  rx="18"
                  height={barHeight(bar1, 90)}
                  y={barY(bar1, 90)}
                />
                <AnimatedRect
                  x="494"
                  width="36"
                  rx="18"
                  height={barHeight(bar2, 150)}
                  y={barY(bar2, 150)}
                />
                <AnimatedRect
                  x="546"
                  width="36"
                  rx="18"
                  height={barHeight(bar3, 110)}
                  y={barY(bar3, 110)}
                />
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
