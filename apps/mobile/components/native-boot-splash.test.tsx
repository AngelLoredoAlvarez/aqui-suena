// @vitest-environment jsdom

import { NativeBootSplash } from "@aqui-suena/mobile/components/native-boot-splash";
import { act, cleanup, render, screen } from "@testing-library/react";
import { AccessibilityInfo, useWindowDimensions } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

beforeEach(() => {
  vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
  vi.mocked(useWindowDimensions).mockReturnValue({
    width: 375,
    height: 812,
    scale: 1,
    fontScale: 1,
  });
});

describe("NativeBootSplash", () => {
  it("renders the title and the 17 Labs footer mark", () => {
    render(<NativeBootSplash />);

    expect(screen.getByText("Aquí Suena")).toBeTruthy();
    expect(screen.getByText("by")).toBeTruthy();
    expect(screen.getByText("17")).toBeTruthy();
    expect(screen.getByText("Labs")).toBeTruthy();
  });

  it("exposes the loading state through two progressbar regions", () => {
    render(<NativeBootSplash />);

    expect(screen.getByLabelText("Cargando Aquí Suena")).toBeTruthy();
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
  });

  it("renders the wide layout above the 600px breakpoint", () => {
    vi.mocked(useWindowDimensions).mockReturnValue({
      width: 1024,
      height: 812,
      scale: 1,
      fontScale: 1,
    });

    render(<NativeBootSplash />);

    expect(screen.getByLabelText("Cargando Aquí Suena")).toBeTruthy();
  });

  it("renders a static frame when motion is reduced", async () => {
    vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValueOnce(true);

    render(<NativeBootSplash />);
    await act(async () => {});

    expect(screen.getByLabelText("Cargando Aquí Suena")).toBeTruthy();
  });

  it("keeps rendering when motion detection rejects", async () => {
    vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockRejectedValueOnce(new Error("denied"));

    render(<NativeBootSplash />);
    await act(async () => {});

    expect(screen.getByLabelText("Cargando Aquí Suena")).toBeTruthy();
  });

  it("hides the cursor when it blinks off", async () => {
    vi.useFakeTimers();
    render(<NativeBootSplash />);
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByLabelText("Cargando Aquí Suena")).toBeTruthy();
    vi.useRealTimers();
  });
});
