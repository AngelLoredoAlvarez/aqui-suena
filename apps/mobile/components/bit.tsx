import { type ReactNode, useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { G } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

type BitProps = {
  delay: number;
  reduceMotion: boolean;
  children: ReactNode;
};

export function Bit({ delay, reduceMotion, children }: BitProps) {
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
