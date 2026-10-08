import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaFailure } from "./errors";
import { describeMediaError } from "./errors";
import { pickFallbackUrl } from "./fallback";

export type PlayerStatus = "idle" | "loading" | "playing" | "blocked" | "error";
export type AudioDriver = { play: (url: string) => Promise<void> };

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
  resume: () => void;
};

function asMediaFailure(error: unknown): MediaFailure {
  if (typeof error === "object" && error !== null) {
    const { name, code } = error as { name?: unknown; code?: unknown };
    return {
      name: typeof name === "string" ? name : undefined,
      code: typeof code === "number" ? code : undefined,
    };
  }
  return {};
}

export function usePlayer({ urls, autoplay = true, driver }: UsePlayerProps): UsePlayerReturn {
  const [player, setPlayerState] = useState<UsePlayerState>({
    status: "idle",
    activeUrl: null,
  });

  const urlsRef = useRef<string[]>(urls);
  const driverRef = useRef<AudioDriver>(driver);
  const lastUrlRef = useRef<string | null>(null);
  const runRef = useRef(0);

  useEffect(() => {
    urlsRef.current = urls;
    driverRef.current = driver;
  });

  const attempt = useCallback(async (startUrl: string): Promise<void> => {
    const runId = ++runRef.current;
    const isCurrent = () => runRef.current === runId;

    if (!startUrl) {
      if (isCurrent()) {
        setPlayerState((prevState) => ({ ...prevState, status: "error", activeUrl: null }));
      }
      return;
    }

    setPlayerState((prevState) => ({ ...prevState, status: "loading" }));

    const tried: string[] = [];
    let url: string | null = startUrl;

    while (url !== null && isCurrent()) {
      setPlayerState((prevState) => ({ ...prevState, activeUrl: url }));

      try {
        await driverRef.current.play(url);
      } catch (error: unknown) {
        const detail = describeMediaError(asMediaFailure(error));

        if (detail.status === "blocked") {
          if (isCurrent()) {
            setPlayerState({ status: "blocked", activeUrl: url });
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
      setPlayerState({ status: "playing", activeUrl: url });
      lastUrlRef.current = url;
      return;
    }

    if (isCurrent()) {
      setPlayerState((prevState) => ({ ...prevState, status: "error", activeUrl: null }));
      lastUrlRef.current = null;
    }
    // NOTE: attempt() never rejects: every await lives inside the
    // try/catch above and the mapper is total, so `void attempt(...)`
    // callers need no .catch. If an await is ever added outside the
    // try block, this guarantee must be revisited.
  }, []);

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

  const resume = useCallback(() => {
    void attempt(lastUrlRef.current || urlsRef.current[0]);
  }, [attempt]);

  return {
    status: player.status,
    activeUrl: player.activeUrl,
    play,
    resume,
  };
}
