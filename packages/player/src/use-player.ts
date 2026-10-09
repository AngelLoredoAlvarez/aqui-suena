import { useCallback, useEffect, useRef, useState } from "react";
import { describeMediaError, narrowFailure } from "./errors";
import { pickFallbackUrl } from "./fallback";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "blocked" | "error";
export type AudioDriver = {
  play: (url: string) => Promise<void>;
  pause: () => void;
};

type UsePlayerState = {
  status: PlayerStatus;
  activeUrl: string | null;
};

export type UsePlayerProps = {
  urls: string[];
  autoplay?: boolean;
  driver: AudioDriver;
};

export type UsePlayerReturn = {
  status: PlayerStatus;
  activeUrl: string | null;
  play: () => void;
  pause: () => void;
  resume: () => void;
};

export function usePlayer({ urls, autoplay = true, driver }: UsePlayerProps): UsePlayerReturn {
  const [player, setPlayerState] = useState<UsePlayerState>({
    status: "idle",
    activeUrl: null,
  });

  const urlsRef = useRef<string[]>(urls);
  const driverRef = useRef<AudioDriver>(driver);
  const lastUrlRef = useRef<string | null>(null);
  const runRef = useRef<number>(0);
  const statusRef = useRef<PlayerStatus>("idle");

  useEffect(() => {
    urlsRef.current = urls;
    driverRef.current = driver;
  });

  const updatePlayerState = useCallback((playerStatus: PlayerStatus, url?: string | null): void => {
    statusRef.current = playerStatus;
    setPlayerState((prevState) => ({
      status: playerStatus,
      activeUrl: url === undefined ? prevState.activeUrl : url,
    }));
  }, []);

  const attempt = useCallback(
    async (startUrl: string | undefined): Promise<void> => {
      const runId = ++runRef.current;
      const isCurrent = () => runRef.current === runId;

      if (!startUrl) {
        if (isCurrent()) {
          updatePlayerState("error", null);
        }
        return;
      }

      updatePlayerState("loading");

      const tried: string[] = [];
      let url: string | null = startUrl;

      while (url !== null && isCurrent()) {
        setPlayerState((prevState) => ({ ...prevState, activeUrl: url }));

        try {
          await driverRef.current.play(url);
        } catch (error: unknown) {
          const detail = describeMediaError(narrowFailure(error));

          if (detail.status === "blocked") {
            if (isCurrent()) {
              updatePlayerState("blocked", url);
            }

            lastUrlRef.current = url;
            return;
          }

          tried.push(url);
          url = pickFallbackUrl(tried, urlsRef.current);
          continue;
        }

        if (!isCurrent()) {
          return;
        }

        updatePlayerState("playing", url);
        lastUrlRef.current = url;

        return;
      }

      if (isCurrent()) {
        updatePlayerState("error", null);
        lastUrlRef.current = null;
      }
      // NOTE: attempt() never rejects: every await lives inside the
      // try/catch above and the mapper is total, so `void attempt(...)`
      // callers need no .catch. If an await is ever added outside the
      // try block, this guarantee must be revisited.
    },
    [updatePlayerState],
  );

  useEffect(() => {
    if (!autoplay) {
      return;
    }

    void attempt(urlsRef.current[0]);

    return () => {
      runRef.current++;
    };
  }, [attempt, autoplay]);

  const play = useCallback(() => {
    void attempt(urlsRef.current[0]);
  }, [attempt]);

  const pause = useCallback(() => {
    if (statusRef.current !== "playing" && statusRef.current !== "loading") {
      return;
    }

    runRef.current++;

    try {
      driverRef.current.pause();
      updatePlayerState("paused");
    } catch {
      updatePlayerState("error");
    }
  }, [updatePlayerState]);

  const resume = useCallback(() => {
    if (statusRef.current === "playing" || statusRef.current === "loading") {
      return;
    }

    void attempt(lastUrlRef.current || urlsRef.current[0]);
  }, [attempt]);

  return {
    status: player.status,
    activeUrl: player.activeUrl,
    play,
    pause,
    resume,
  };
}
