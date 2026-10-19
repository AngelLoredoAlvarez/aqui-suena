// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AudioDriver, AudioDriverEvent, NowPlayingMetadata } from "./use-player";
import { usePlayer } from "./use-player";

const URL_A = "https://ice1.example/live";
const URL_B = "https://ice2.example/live";

function createFakeDriver(failures: Record<string, unknown> = {}) {
  const played: string[] = [];
  const paused: number[] = [];
  const published: Array<NowPlayingMetadata | null> = [];
  const listeners = new Set<(event: AudioDriverEvent) => void>();
  const driver: AudioDriver = {
    play: async (url: string) => {
      played.push(url);
      const failure = failures[url];
      if (failure !== undefined) {
        throw failure;
      }
    },
    pause: () => {
      paused.push(1);
    },
    setNowPlaying: (metadata) => {
      published.push(metadata);
    },
    subscribePlayback: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  const emitPlayback = (playing: boolean): void => {
    for (const listener of listeners) {
      listener({ playing });
    }
  };
  return { driver, played, paused, published, emitPlayback };
}

describe("usePlayer", () => {
  it("autoplays the first url on mount when autoplay is true", async () => {
    const { driver, played } = createFakeDriver();
    const { result } = renderHook(() =>
      usePlayer({ urls: [URL_A, URL_B], autoplay: true, driver }),
    );

    await waitFor(() => expect(result.current.status).toBe("playing"));
    expect(result.current.activeUrl).toBe(URL_A);
    expect(played).toEqual([URL_A]);
  });

  it("stays idle until play is called when autoplay is false", async () => {
    const { driver } = createFakeDriver();
    const { result } = renderHook(() => usePlayer({ urls: [URL_A], autoplay: false, driver }));

    expect(result.current.status).toBe("idle");

    await act(async () => {
      result.current.play();
    });
    await waitFor(() => expect(result.current.status).toBe("playing"));
  });

  it("maps autoplay rejection to blocked without rotating mirrors", async () => {
    const { driver, played } = createFakeDriver({
      [URL_A]: { name: "NotAllowedError" },
    });
    const { result } = renderHook(() =>
      usePlayer({ urls: [URL_A, URL_B], autoplay: true, driver }),
    );

    await waitFor(() => expect(result.current.status).toBe("blocked"));
    expect(result.current.activeUrl).toBe(URL_A);
    expect(played).toEqual([URL_A]);
  });

  it("rotates to the next mirror when the primary fails", async () => {
    const { driver, played } = createFakeDriver({ [URL_A]: { code: 4 } });
    const { result } = renderHook(() =>
      usePlayer({ urls: [URL_A, URL_B], autoplay: true, driver }),
    );

    await waitFor(() => expect(result.current.status).toBe("playing"));
    expect(result.current.activeUrl).toBe(URL_B);
    expect(played).toEqual([URL_A, URL_B]);
  });

  it("reports error when every mirror fails", async () => {
    const { driver } = createFakeDriver({
      [URL_A]: { code: 4 },
      [URL_B]: { code: 4 },
    });
    const { result } = renderHook(() =>
      usePlayer({ urls: [URL_A, URL_B], autoplay: true, driver }),
    );

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("retries the current url on resume after blocked", async () => {
    const failures: Record<string, unknown> = {
      [URL_A]: { name: "NotAllowedError" },
    };
    const { driver } = createFakeDriver(failures);
    const { result } = renderHook(() =>
      usePlayer({ urls: [URL_A, URL_B], autoplay: true, driver }),
    );

    await waitFor(() => expect(result.current.status).toBe("blocked"));

    delete failures[URL_A];
    await act(async () => {
      result.current.resume();
    });
    await waitFor(() => expect(result.current.status).toBe("playing"));
    expect(result.current.activeUrl).toBe(URL_A);
  });

  it("should return error when urls are empty", async () => {
    const { driver } = createFakeDriver();
    const { result } = renderHook(() => usePlayer({ urls: [], driver }));

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("treats a non-object rejection as a generic failure and rotates", async () => {
    const { driver, played } = createFakeDriver({ [URL_A]: null });
    const { result } = renderHook(() =>
      usePlayer({ urls: [URL_A, URL_B], autoplay: true, driver }),
    );

    await waitFor(() => expect(result.current.status).toBe("playing"));
    expect(result.current.activeUrl).toBe(URL_B);
    expect(played).toEqual([URL_A, URL_B]);
  });

  it("ignores a stale attempt superseded by a newer one", async () => {
    const pending: Array<{
      url: string;
      resolve: () => void;
    }> = [];
    const driver: AudioDriver = {
      play: (url: string) =>
        new Promise<void>((resolve) => {
          pending.push({ url, resolve });
        }),
      pause: vi.fn(),
    };
    const { result } = renderHook(() =>
      usePlayer({ urls: [URL_A, URL_B], autoplay: true, driver }),
    );

    await waitFor(() => expect(pending.length).toBe(1));

    await act(async () => {
      result.current.play();
    });
    await waitFor(() => expect(pending.length).toBe(2));

    await act(async () => {
      pending[0]?.resolve();
    });
    expect(result.current.status).toBe("loading");

    await act(async () => {
      pending[1]?.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe("playing"));
    expect(result.current.activeUrl).toBe(URL_A);
  });

  it("pauses playback keeping the current url", async () => {
    const { driver, paused } = createFakeDriver();
    const { result } = renderHook(() => usePlayer({ urls: [URL_A], autoplay: true, driver }));

    await waitFor(() => expect(result.current.status).toBe("playing"));

    await act(async () => {
      result.current.pause();
    });

    expect(result.current.status).toBe("paused");
    expect(result.current.activeUrl).toBe(URL_A);
    expect(paused).toHaveLength(1);
  });

  it("resumes from paused to playing", async () => {
    const { driver } = createFakeDriver();
    const { result } = renderHook(() => usePlayer({ urls: [URL_A], autoplay: true, driver }));

    await waitFor(() => expect(result.current.status).toBe("playing"));

    await act(async () => {
      result.current.pause();
    });
    expect(result.current.status).toBe("paused");

    await act(async () => {
      result.current.resume();
    });
    await waitFor(() => expect(result.current.status).toBe("playing"));
    expect(result.current.activeUrl).toBe(URL_A);
  });

  it("pauses only once on double pause", async () => {
    const { driver, paused } = createFakeDriver();
    const { result } = renderHook(() => usePlayer({ urls: [URL_A], autoplay: true, driver }));

    await waitFor(() => expect(result.current.status).toBe("playing"));

    await act(async () => {
      result.current.pause();
    });
    await act(async () => {
      result.current.pause();
    });

    expect(result.current.status).toBe("paused");
    await waitFor(() => expect(paused).toHaveLength(1));
  });

  it("ignores pause when idle", async () => {
    const { driver, paused } = createFakeDriver();
    const { result } = renderHook(() => usePlayer({ urls: [URL_A], autoplay: false, driver }));

    expect(result.current.status).toBe("idle");

    await act(async () => {
      result.current.pause();
    });

    expect(result.current.status).toBe("idle");
    expect(paused).toHaveLength(0);
  });

  it("ignores resume when already playing", async () => {
    const { driver, played } = createFakeDriver();
    const { result } = renderHook(() => usePlayer({ urls: [URL_A], autoplay: true, driver }));

    await waitFor(() => expect(result.current.status).toBe("playing"));

    await act(async () => {
      result.current.resume();
    });

    expect(result.current.status).toBe("playing");
    expect(played).toEqual([URL_A]);
  });

  it("cancels a pending autoplay attempt on unmount", async () => {
    const played: string[] = [];
    let resolvePlay!: () => void;
    const driver: AudioDriver = {
      play: (url: string) => {
        played.push(url);
        return new Promise<void>((resolve) => {
          resolvePlay = resolve;
        });
      },
      pause: vi.fn(),
    };
    const { unmount } = renderHook(() =>
      usePlayer({ urls: [URL_A, URL_B], autoplay: true, driver }),
    );

    await waitFor(() => expect(played).toEqual([URL_A]));
    unmount();

    await act(async () => {
      resolvePlay();
    });
    expect(played).toEqual([URL_A]);
  });

  it("maps driver pause failure to error", async () => {
    const { driver } = createFakeDriver();
    driver.pause = () => {
      throw new Error("Something went wrong!");
    };

    const { result } = renderHook(() => usePlayer({ urls: [URL_A], autoplay: false, driver }));

    await act(async () => {
      result.current.play();
    });

    await waitFor(() => expect(result.current.status).toBe("playing"));

    await act(async () => {
      result.current.pause();
    });

    expect(result.current.status).toBe("error");
  });

  it("keep the previous url active while switching to a new one", async () => {
    const pending: Array<() => void> = [];
    const played: string[] = [];

    const driver: AudioDriver = {
      play: (url: string) => {
        played.push(url);

        return new Promise<void>((resolve) => {
          pending.push(resolve);
        });
      },
      pause: vi.fn(),
    };

    const { result, rerender } = renderHook(
      ({ urls }: { urls: string[] }) => usePlayer({ urls, autoplay: true, driver }),
      {
        initialProps: { urls: [URL_A] },
      },
    );

    await waitFor(() => expect(pending.length).toBe(1));
    await act(async () => {
      pending[0]?.();
    });

    await waitFor(() => expect(result.current.status).toBe("playing"));
    expect(result.current.activeUrl).toBe(URL_A);

    rerender({ urls: [URL_B] });

    await act(async () => {
      pending[1]?.();
    });
    await waitFor(() => expect(result.current.status).toBe("playing"));
    expect(result.current.activeUrl).toBe(URL_B);
  });
});

describe("usePlayer now playing", () => {
  const NOW_PLAYING = { title: "Test Pop", artist: "Aqui Suena" };

  it("publishes the station metadata once playback starts", async () => {
    const { driver, published } = createFakeDriver();

    const { result } = renderHook(() =>
      usePlayer({ urls: [URL_A], driver, nowPlaying: NOW_PLAYING }),
    );

    await waitFor(() => expect(result.current.status).toBe("playing"));
    expect(published.at(-1)).toEqual(NOW_PLAYING);
  });

  it("clears the system metadata when every mirror fails", async () => {
    const { driver, published } = createFakeDriver({
      [URL_A]: { code: 4 },
      [URL_B]: { code: 4 },
    });

    const { result } = renderHook(() =>
      usePlayer({ urls: [URL_A, URL_B], driver, nowPlaying: NOW_PLAYING }),
    );

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(published.at(-1)).toBeNull();
  });

  it("reflects a system pause in the app status and back", async () => {
    const { driver, emitPlayback } = createFakeDriver();

    const { result } = renderHook(() => usePlayer({ urls: [URL_A], driver }));

    await waitFor(() => expect(result.current.status).toBe("playing"));

    await act(async () => {
      emitPlayback(false);
    });
    expect(result.current.status).toBe("paused");

    await act(async () => {
      emitPlayback(true);
    });
    expect(result.current.status).toBe("playing");
  });

  it("ignores system events while a station switch is loading", async () => {
    const { driver, emitPlayback } = createFakeDriver();
    let settle!: () => void;
    driver.play = () =>
      new Promise<void>((resolve) => {
        settle = resolve;
      });

    const { result } = renderHook(() => usePlayer({ urls: [URL_A], driver }));

    await waitFor(() => expect(result.current.status).toBe("loading"));

    await act(async () => {
      emitPlayback(false);
    });
    expect(result.current.status).toBe("loading");

    await act(async () => {
      settle();
    });
    await waitFor(() => expect(result.current.status).toBe("playing"));
  });
});
