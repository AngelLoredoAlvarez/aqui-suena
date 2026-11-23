import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

const LOGO = require("../assets/splash-logo-dark.png");
const MARK = require("../assets/splash-17labs-dark.png");
const MONOSPACE = Platform.select({ ios: "Menlo", default: "monospace" });

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
  const progress = useRef(new Animated.Value(0.4)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

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
      progress.setValue(1);
      return;
    }

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    });
    animation.start();

    return () => animation.stop();
  }, [progress, reduceMotion]);

  const fillWidth = progress.interpolate({
    inputRange: [0.4, 1],
    outputRange: [trackWidth * 0.4, trackWidth],
  });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando Aquí Suena"
      style={styles.root}
    >
      <View style={[styles.stack, { gap: wide ? 39 : 28 }]}>
        <Image
          source={LOGO}
          style={{ width: logoSize, height: logoSize }}
          resizeMode="contain"
          accessibilityLabel="Logo de Aquí Suena"
        />
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
          <Animated.View style={[styles.fill, { width: fillWidth }]} />
        </View>
      </View>
      <View style={[styles.by, { bottom: footerBottom }]}>
        <Text style={[styles.mono, styles.muted, { fontSize: footerSize }]}>by</Text>
        <View style={styles.markColumn}>
          <Image source={MARK} style={{ width: markSize, height: markSize }} resizeMode="contain" />
          <View style={styles.wordmark}>
            <Text style={[styles.mono, styles.strong, { fontSize: footerSize }]}>17</Text>
            <Text style={[styles.mono, styles.labs, { fontSize: footerSize }]}>Labs</Text>
            <View style={styles.cursor} />
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
    backgroundColor: "#1F2D3E",
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
