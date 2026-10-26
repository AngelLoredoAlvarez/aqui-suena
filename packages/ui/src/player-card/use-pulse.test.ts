// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PULSE_INTERVAL_MS, usePulse } from "./use-pulse";

describe("usePulse", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("is false when not playing", () => {
    const { result } = renderHook(() => usePulse(false));
    expect(result.current).toBe(false);
  });

  it("toggles while playing and stops when paused", () => {
    const { result, rerender } = renderHook(({ playing }) => usePulse(playing), {
      initialProps: { playing: true },
    });
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(PULSE_INTERVAL_MS));
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(PULSE_INTERVAL_MS));
    expect(result.current).toBe(true);

    rerender({ playing: false });
    expect(result.current).toBe(false);
  });
});
