import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

export interface BootSplashAnimation {
  readonly reduceMotion: boolean;
  readonly cursorVisible: boolean;
  readonly arc: Animated.Value;
  readonly arcAlt: Animated.Value;
  readonly fill: Animated.Value;
  readonly bars: readonly [Animated.Value, Animated.Value, Animated.Value];
}

export function useBootSplashAnimation(): BootSplashAnimation {
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

    const barAnimations = [bar1, bar2, bar3].map((value, index) =>
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

    const animations = [arcLoop, arcAltLoop, fillLoop, ...barAnimations];

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

  return {
    reduceMotion,
    cursorVisible,
    arc,
    arcAlt,
    fill,
    bars: [bar1, bar2, bar3],
  };
}
