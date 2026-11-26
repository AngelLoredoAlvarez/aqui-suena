import { FooterMark } from "@aqui-suena/mobile/components/footer-mark";
import {
  BAR_CORNER_RADIUS,
  BAR_WIDTH,
  SPEAKER_CENTER_Y,
} from "@aqui-suena/mobile/components/splash-bars";
import { splashLayout } from "@aqui-suena/mobile/components/splash-layout";
import {
  ARC_PROGRESS_INPUT_RANGE,
  ARC_PROGRESS_OUTPUT_RANGE,
  FILL_PROGRESS_INPUT_RANGE,
  fillProgressOutputRange,
  zipEqualizerBars,
} from "@aqui-suena/mobile/components/splash-progress";
import { useBootSplashAnimation } from "@aqui-suena/mobile/components/use-boot-splash-animation";
import { Animated, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { G, Path, Rect } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export function NativeBootSplash() {
  const { width } = useWindowDimensions();
  const { wide, logoSize, titleSize, trackWidth, trackMargin, footerBottom, footerSize, markSize } =
    splashLayout(width);
  const { reduceMotion, cursorVisible, arc, arcAlt, fill, bars } = useBootSplashAnimation();

  const equalizerBars = zipEqualizerBars(bars);

  const arcOpacity = arc.interpolate({
    inputRange: ARC_PROGRESS_INPUT_RANGE,
    outputRange: ARC_PROGRESS_OUTPUT_RANGE,
  });

  const arcAltOpacity = arcAlt.interpolate({
    inputRange: ARC_PROGRESS_INPUT_RANGE,
    outputRange: ARC_PROGRESS_OUTPUT_RANGE,
  });

  const fillWidth = fill.interpolate({
    inputRange: FILL_PROGRESS_INPUT_RANGE,
    outputRange: fillProgressOutputRange(trackWidth),
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
      <FooterMark
        footerBottom={footerBottom}
        footerSize={footerSize}
        markSize={markSize}
        arcOpacity={arcOpacity}
        reduceMotion={reduceMotion}
        cursorVisible={cursorVisible}
      />
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
});
