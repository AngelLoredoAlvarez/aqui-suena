// @vitest-environment jsdom

import { useBootSplashAnimation } from "@aqui-suena/mobile/components/use-boot-splash-animation";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  reduceMotionEnabled: false,
  loops: 0,
  started: 0,
  stopped: 0,
}));

vi.mock("react-native", () => {
  class Value {
    value: number;

    constructor(value: number) {
      this.value = value;
    }

    setValue(value: number): void {
      this.value = value;
    }

    interpolate(): unknown {
      return { __interpolation: true };
    }
  }

  const composite = () => ({
    start: () => {
      native.started += 1;
    },
    stop: () => {
      native.stopped += 1;
    },
  });

  return {
    Animated: {
      Value,
      loop: () => {
        native.loops += 1;
        return composite();
      },
      sequence: () => composite(),
      delay: () => composite(),
      timing: () => composite(),
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: () => Promise.resolve(native.reduceMotionEnabled),
    },
    Easing: {
      ease: "ease",
      in: (easing: unknown) => easing,
      inOut: (easing: unknown) => easing,
    },
  };
});

type FakeValue = { value: number };

describe("useBootSplashAnimation", () => {
  beforeEach(() => {
    native.reduceMotionEnabled = false;
    native.loops = 0;
    native.started = 0;
    native.stopped = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts the animation loops when motion is not reduced", () => {
    renderHook(() => useBootSplashAnimation());

    expect(native.loops).toBeGreaterThan(0);
    expect(native.started).toBeGreaterThan(0);
  });

  it("renders a static frame and starts no loops when motion is reduced", async () => {
    native.reduceMotionEnabled = true;
    const { result } = renderHook(() => useBootSplashAnimation());

    // The mount runs once with the default false, then the async detection
    // flips reduceMotion to true. Reset the loop counter before that flip.
    native.loops = 0;
    await act(async () => {});

    expect(result.current.reduceMotion).toBe(true);
    expect((result.current.arc as unknown as FakeValue).value).toBe(0.4);
    expect((result.current.fill as unknown as FakeValue).value).toBe(0.4);
    const [bar1] = result.current.bars;
    expect((bar1 as unknown as FakeValue).value).toBe(1);
    expect(native.loops).toBe(0);
  });

  it("blinks the cursor only when motion is not reduced", async () => {
    const { result } = renderHook(() => useBootSplashAnimation());
    const initial = result.current.cursorVisible;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(result.current.cursorVisible).toBe(!initial);
  });

  it("stops the loops on unmount", () => {
    const { unmount } = renderHook(() => useBootSplashAnimation());
    unmount();

    expect(native.stopped).toBeGreaterThan(0);
  });
});
