// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useExpoAudioDriver } from "./expo-driver";

type PlayBehavior = { kind: "resolve" } | { kind: "reject"; error: unknown };

const audioBehavior: { current: PlayBehavior } = { current: { kind: "resolve" } };
const playedUrls: string[] = [];
const pauseTargets: FakeAudio[] = [];

class FakeAudio {
  src = "";
  attributes: Record<string, string> = {};
  paused = false;

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  play(): Promise<void> {
    playedUrls.push(this.src);
    const behavior = audioBehavior.current;
    if (behavior.kind === "reject") {
      return Promise.reject(behavior.error);
    }
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
    pauseTargets.push(this);
  }
}

describe("useExpoAudioDriver (web)", () => {
  beforeEach(() => {
    vi.stubGlobal("Audio", FakeAudio);
    playedUrls.length = 0;
    pauseTargets.length = 0;
    audioBehavior.current = { kind: "resolve" };
  });

  it("plays the url through the same-origin proxy", async () => {
    const { result } = renderHook(() => useExpoAudioDriver());

    await act(async () => {
      await result.current.play("https://ice1.example/live");
    });

    expect(playedUrls).toEqual(["/api/stream?url=https%3A%2F%2Fice1.example%2Flive"]);
  });

  it("surfaces autoplay blocks as NotAllowedError failures", async () => {
    audioBehavior.current = { kind: "reject", error: { name: "NotAllowedError" } };
    const { result } = renderHook(() => useExpoAudioDriver());

    let failure: unknown;
    await act(async () => {
      await result.current.play("https://ice1.example/live").catch((error: unknown) => {
        failure = error;
      });
    });

    expect(failure).toEqual({ name: "NotAllowedError" });
  });

  it("surfaces unloadable sources as code 4", async () => {
    audioBehavior.current = { kind: "reject", error: { name: "NotSupportedError" } };
    const { result } = renderHook(() => useExpoAudioDriver());

    let failure: unknown;
    await act(async () => {
      await result.current.play("https://ice1.example/live").catch((error: unknown) => {
        failure = error;
      });
    });

    expect(failure).toEqual({ code: 4 });
  });

  it("pauses the element after play()", async () => {
    const { result } = renderHook(() => useExpoAudioDriver());

    await act(async () => {
      await result.current.play("https://ice1.example/live");
    });
    result.current.pause();

    expect(pauseTargets).toHaveLength(1);
    expect(pauseTargets[0]?.paused).toBe(true);
  });
});
