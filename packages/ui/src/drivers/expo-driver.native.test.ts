// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toMediaFailure, useExpoAudioDriver } from "./expo-driver.native";

type FakeNativePlayer = {
  replace: (url: string) => void;
  play: () => void;
  pause: () => void;
  setActiveForLockScreen: ReturnType<typeof vi.fn>;
  updateLockScreenMetadata: ReturnType<typeof vi.fn>;
  clearLockScreenControls: ReturnType<typeof vi.fn>;
};

function playerAt(index: number): FakeNativePlayer {
  const player = mocks.players[index];
  if (!player) {
    throw new Error(`Missing mocked player at index ${index}`);
  }
  return player;
}

const mocks = vi.hoisted(() => ({
  players: [] as FakeNativePlayer[],
  statuses: new Map<object, { playing: boolean; error: string | null }>(),
  nextPlayerIndex: 0,
  setAudioModeAsync: vi.fn(async () => {}),
}));

function setPlayerStatus(index: number, status: { playing: boolean; error: string | null }) {
  mocks.statuses.set(playerAt(index), status);
}

vi.mock("expo-audio", () => ({
  useAudioPlayer: () => {
    const existing = mocks.players[mocks.nextPlayerIndex];
    mocks.nextPlayerIndex += 1;
    if (existing) {
      return existing;
    }
    const player: FakeNativePlayer = {
      replace: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      setActiveForLockScreen: vi.fn(),
      updateLockScreenMetadata: vi.fn(),
      clearLockScreenControls: vi.fn(),
    };
    mocks.players.push(player);
    mocks.statuses.set(player, { playing: false, error: null });
    return player;
  },
  useAudioPlayerStatus: (player: object) => {
    mocks.nextPlayerIndex = 0;
    return mocks.statuses.get(player) ?? { playing: false, error: null };
  },
  setAudioModeAsync: mocks.setAudioModeAsync,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.players.length = 0;
  mocks.statuses.clear();
  mocks.nextPlayerIndex = 0;
});

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

    expect(playerAt(0).replace).toHaveBeenCalledWith("https://ice1.example/live");
    expect(playerAt(0).play).toHaveBeenCalledTimes(1);

    await act(async () => {
      setPlayerStatus(0, { playing: true, error: null });
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
      setPlayerStatus(0, { playing: false, error: "NotAllowedError: play() failed" });
      rerender();
    });
    await pending;

    expect(rejection).toEqual({ name: "NotAllowedError" });
  });

  it("configures background-safe audio on mount", () => {
    renderHook(() => useExpoAudioDriver());

    expect(mocks.setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(mocks.setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
  });

  it("pauses the committed player on pause()", async () => {
    const { result, rerender } = renderHook(() => useExpoAudioDriver());

    const pending = result.current.play("https://ice1.example/live");
    await act(async () => {
      setPlayerStatus(0, { playing: true, error: null });
      rerender();
    });
    await pending;

    result.current.pause();

    expect(playerAt(0).pause).toHaveBeenCalledTimes(1);
  });

  it("keeps the previous player until the next one reports playing", async () => {
    const { result, rerender } = renderHook(() => useExpoAudioDriver());

    let firstSettled = false;
    const firstPending = result.current.play("https://ice1.example/live").then(() => {
      firstSettled = true;
    });

    await act(async () => {
      setPlayerStatus(0, { playing: true, error: null });
      rerender();
    });

    await firstPending;
    expect(firstSettled).toBe(true);

    let secondSettled = false;
    const secondPending = result.current.play("https://ice2.example/live").then(() => {
      secondSettled = true;
    });

    expect(mocks.players).toHaveLength(2);

    const first = playerAt(0);
    const second = playerAt(1);

    expect(second).not.toBe(first);
    expect(first.pause).not.toHaveBeenCalled();

    await act(async () => {
      setPlayerStatus(1, { playing: true, error: null });
      rerender();
    });

    await secondPending;

    expect(secondSettled).toBe(true);
    expect(first.pause).toHaveBeenCalledTimes(1);
  });

  it("activates the lock screen on the player that reports playing", async () => {
    const { result, rerender } = renderHook(() => useExpoAudioDriver());
    const metadata = { title: "Test Pop", artist: "Aquí Suena" };

    const pending = result.current.play("https://ice1.example/live");
    await act(async () => {
      setPlayerStatus(0, { playing: true, error: null });
      rerender();
    });
    await pending;

    result.current.setNowPlaying?.(metadata);

    expect(playerAt(0).setActiveForLockScreen).toHaveBeenCalledWith(true, metadata, {
      isLiveStream: true,
      showSeekForward: false,
      showSeekBackward: false,
      showNextTrack: false,
      showPreviousTrack: false,
    });
  });

  it("moves the lock screen to the next player and clears the previous one", async () => {
    const { result, rerender } = renderHook(() => useExpoAudioDriver());

    const firstPending = result.current.play("https://ice1.example/live");
    await act(async () => {
      setPlayerStatus(0, { playing: true, error: null });
      rerender();
    });
    await firstPending;
    result.current.setNowPlaying?.({ title: "Test Pop" });

    const secondPending = result.current.play("https://ice2.example/live");
    await act(async () => {
      setPlayerStatus(1, { playing: true, error: null });
      rerender();
    });
    await secondPending;
    result.current.setNowPlaying?.({ title: "Test Night" });

    expect(playerAt(0).clearLockScreenControls).toHaveBeenCalledTimes(1);
    expect(playerAt(1).setActiveForLockScreen).toHaveBeenCalledWith(
      true,
      { title: "Test Night" },
      expect.objectContaining({ isLiveStream: true }),
    );
  });

  it("updates metadata instead of rebuilding the session on the same player", async () => {
    const { result, rerender } = renderHook(() => useExpoAudioDriver());
    const metadata = { title: "Test Pop", artist: "Aquí Suena" };

    const pending = result.current.play("https://ice1.example/live");
    await act(async () => {
      setPlayerStatus(0, { playing: true, error: null });
      rerender();
    });
    await pending;

    result.current.setNowPlaying?.(metadata);
    expect(playerAt(0).setActiveForLockScreen).toHaveBeenCalledTimes(1);

    result.current.setNowPlaying?.(metadata);
    expect(playerAt(0).setActiveForLockScreen).toHaveBeenCalledTimes(1);

    result.current.setNowPlaying?.({ title: "Test Night", artist: "Aquí Suena" });
    expect(playerAt(0).updateLockScreenMetadata).toHaveBeenCalledWith({
      title: "Test Night",
      artist: "Aquí Suena",
    });
    expect(playerAt(0).setActiveForLockScreen).toHaveBeenCalledTimes(1);
  });

  it("emits playback events only for the committed player", async () => {
    const events: Array<{ playing: boolean }> = [];
    const { result, rerender } = renderHook(() => useExpoAudioDriver());
    result.current.subscribePlayback?.((event) => {
      events.push(event);
    });

    const pending = result.current.play("https://ice1.example/live");
    await act(async () => {
      setPlayerStatus(0, { playing: true, error: null });
      rerender();
    });
    await pending;

    expect(events).toEqual([]);

    await act(async () => {
      setPlayerStatus(0, { playing: false, error: null });
      rerender();
    });

    expect(events).toEqual([{ playing: false }]);

    await act(async () => {
      setPlayerStatus(0, { playing: true, error: null });
      rerender();
    });

    expect(events.at(-1)).toEqual({ playing: true });

    await act(async () => {
      setPlayerStatus(1, { playing: true, error: null });
      rerender();
    });

    expect(events).toHaveLength(2);
  });
});
