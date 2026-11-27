import type { ReactNode } from "react";
import React from "react";
import { vi } from "vitest";

type Props = { children?: ReactNode; [key: string]: unknown };

/**
 * Maps React Native host components to DOM elements so components can be
 * rendered with @testing-library/react + jsdom. accessibility* props become
 * their ARIA equivalents so the queries stay semantic.
 */
vi.mock("react-native", () => {
  const flattenStyle = (style: unknown): unknown => {
    if (!Array.isArray(style)) {
      return style;
    }

    return style.reduce<Record<string, unknown>>((acc, item) => {
      if (item && typeof item === "object") {
        Object.assign(acc, item);
      }

      return acc;
    }, {});
  };

  const host =
    (type: string) =>
    ({
      accessibilityLabel,
      accessibilityRole,
      accessible: _accessible,
      style,
      children,
      ...props
    }: Props) =>
      React.createElement(
        type,
        {
          ...props,
          style: flattenStyle(style),
          ...(accessibilityLabel !== undefined ? { "aria-label": accessibilityLabel } : {}),
          ...(accessibilityRole !== undefined ? { role: accessibilityRole } : {}),
        },
        children,
      );

  const View = host("div");
  const Text = host("span");

  class AnimatedValue {
    value: number;

    constructor(value: number) {
      this.value = value;
    }

    setValue(value: number): void {
      this.value = value;
    }

    interpolate(): number {
      return 0.5;
    }
  }

  const composite = () => ({ start: () => {}, stop: () => {} });
  const animatedMath = () => 0;

  return {
    View,
    Text,
    Animated: {
      Value: AnimatedValue,
      View: host("div"),
      createAnimatedComponent: (Component: unknown) => Component,
      multiply: animatedMath,
      subtract: animatedMath,
      divide: animatedMath,
      sequence: composite,
      delay: composite,
      loop: composite,
      timing: composite,
    },
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: flattenStyle,
    },
    Platform: {
      OS: "ios",
      select: (options: Record<string, unknown>) => options.ios ?? options.default,
    },
    Easing: {
      ease: "ease",
      in: (easing: unknown) => easing,
      inOut: (easing: unknown) => easing,
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: vi.fn(() => Promise.resolve(false)),
    },
    useWindowDimensions: vi.fn(() => ({ width: 375, height: 812, scale: 1, fontScale: 1 })),
  };
});

vi.mock("react-native-svg", () => {
  const host =
    (type: string) =>
    ({ children, translateY: _translateY, ...props }: Props) =>
      React.createElement(type, props, children);

  const Svg = host("svg");

  return {
    default: Svg,
    Svg,
    G: host("g"),
    Path: host("path"),
    Rect: host("rect"),
    Ellipse: host("ellipse"),
    Circle: host("circle"),
    Line: host("line"),
  };
});

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
  },
}));

vi.mock("expo-router", () => ({
  Stack: () => React.createElement("div", { "data-testid": "stack" }),
}));

vi.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: () => Promise.resolve(),
  hideAsync: () => Promise.resolve(),
  hide: () => {},
}));

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "es-MX" }],
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: Props) => children,
  useSafeAreaInsets: vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
}));

vi.mock("@expo-google-fonts/plus-jakarta-sans", () => ({
  PlusJakartaSans_400Regular: "font-400",
  PlusJakartaSans_600SemiBold: "font-600",
  PlusJakartaSans_700Bold: "font-700",
  useFonts: vi.fn(() => [true, null]),
}));
