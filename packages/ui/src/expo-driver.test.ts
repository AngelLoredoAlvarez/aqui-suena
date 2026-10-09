// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useExpoAudioDriver } from "./expo-driver";

type PlayBehavior = { kind: "resolve" } | { kind: "reject"; error: unknown };

const audioBehavior: { current: PlayBehavior } = { current: { kind: "resolve" } };
const playedUrls: string[] = [];

class FakeAudio {
  src = "";
  attributes: Record<string, string> = {};

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

  pause(): void {}
}

describe("useExpoAudioDriver (web)", () => {
  beforeEach(() => {
    vi.stubGlobal("Audio", FakeAudio);
    playedUrls.length = 0;
    audioBehavior.current = { kind: "resolve" };
  });

  it("plays the url through an audio element", async () => {
    const { result } = renderHook(() => useExpoAudioDriver());

    await act(async () => {
      await result.current.play("https://ice1.example/live");
    });

    expect(playedUrls).toEqual(["https://ice1.example/live"]);
  });

  it("omits the referrer so hotlink-protected hosts do not 403", async () => {
    const attributes: Record<string, string> = {};
    vi.stubGlobal(
      "Audio",
      class {
        src = "";

        setAttribute(name: string, value: string): void {
          attributes[name] = value;
        }

        play(): Promise<void> {
          return Promise.resolve();
        }

        pause(): void {}
      },
    );
    const { result } = renderHook(() => useExpoAudioDriver());

    await act(async () => {
      await result.current.play("https://ice1.example/live");
    });

    expect(attributes.referrerpolicy).toBe("no-referrer");
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
});
