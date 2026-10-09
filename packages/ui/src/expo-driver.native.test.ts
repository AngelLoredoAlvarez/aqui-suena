// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toMediaFailure, useExpoAudioDriver } from "./expo-driver.native";

const mocks = vi.hoisted(() => ({
  player: {
    replace: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    id: "test-player",
  },
  status: {
    current: { playing: false, error: null as string | null },
  },
}));

vi.mock("expo-audio", () => ({
  useAudioPlayer: () => mocks.player,
  useAudioPlayerStatus: () => mocks.status.current,
}));

describe("toMediaFailure", () => {
  it("maps silence to a generic failure", () => {
    expect(toMediaFailure(null)).toEqual({});
  });

  it("maps autoplay policy blocks to NotAllowedError", () => {
    expect(toMediaFailure("NotAllowedError: play() failed")).toEqual({
      name: "NotAllowedError",
    });
  });

  it("maps unsupported formats to code 4", () => {
    expect(toMediaFailure("The format is not supported")).toEqual({ code: 4 });
  });

  it("maps anything else to a generic failure so rotation engages", () => {
    expect(toMediaFailure("network timeout")).toEqual({});
  });
});

describe("useExpoAudioDriver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.status.current = { playing: false, error: null };
  });

  it("replaces the source and plays on play()", async () => {
    const { result, rerender } = renderHook(() => useExpoAudioDriver());

    let settled: string | undefined;
    const pending = result.current.play("https://ice1.example/live").then(
      () => {
        settled = "resolved";
      },
      () => {
        settled = "rejected";
      },
    );

    expect(mocks.player.replace).toHaveBeenCalledWith("https://ice1.example/live");
    expect(mocks.player.play).toHaveBeenCalledTimes(1);

    await act(async () => {
      mocks.status.current = { playing: true, error: null };
      rerender();
    });
    await pending;

    expect(settled).toBe("resolved");
  });

  it("rejects shaped failures when the status carries an error", async () => {
    const { result, rerender } = renderHook(() => useExpoAudioDriver());

    let rejection: unknown;
    const pending = result.current.play("https://ice1.example/live").then(
      () => {},
      (reason: unknown) => {
        rejection = reason;
      },
    );

    await act(async () => {
      mocks.status.current = { playing: false, error: "NotAllowedError: play() failed" };
      rerender();
    });
    await pending;

    expect(rejection).toEqual({ name: "NotAllowedError" });
  });
});
