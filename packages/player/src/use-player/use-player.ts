import { describeMediaError, narrowFailure } from "@aqui-suena/player/errors";
import { pickFallbackUrl } from "@aqui-suena/player/fallback";
import { useCallback, useEffect, useRef, useState } from "react";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "blocked" | "error";

export type NowPlayingMetadata = {
  readonly title: string;
  readonly artist?: string;
};

export type AudioDriverEvent = {
  readonly playing: boolean;
};

export type AudioDriver = {
  play: (url: string) => Promise<void>;
  pause: () => void;
  setNowPlaying?: (metadata: NowPlayingMetadata | null) => void;
  subscribePlayback?: (listener: (event: AudioDriverEvent) => void) => () => void;
};

type UsePlayerState = {
  status: PlayerStatus;
  activeUrl: string | null;
};

export type UsePlayerProps = {
  urls: string[];
  autoplay?: boolean;
  driver: AudioDriver;
  nowPlaying?: NowPlayingMetadata;
};

export type UsePlayerReturn = {
  status: PlayerStatus;
  activeUrl: string | null;
  play: () => void;
  pause: () => void;
  resume: () => void;
};

export function usePlayer({
  urls,
  autoplay = true,
  driver,
  nowPlaying,
}: UsePlayerProps): UsePlayerReturn {
  const [player, setPlayerState] = useState<UsePlayerState>({
    status: "idle",
    activeUrl: null,
  });

  const urlsRef = useRef<string[]>(urls);
  const driverRef = useRef<AudioDriver>(driver);
  const lastUrlRef = useRef<string | null>(null);
  const runRef = useRef<number>(0);
  const statusRef = useRef<PlayerStatus>("idle");
  const nowPlayingRef = useRef<NowPlayingMetadata | undefined>(nowPlaying);

  useEffect(() => {
    urlsRef.current = urls;
    driverRef.current = driver;
    nowPlayingRef.current = nowPlaying;
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
        driverRef.current.setNowPlaying?.(nowPlayingRef.current ?? null);

        return;
      }

      if (isCurrent()) {
        updatePlayerState("error", null);
        lastUrlRef.current = null;
        driverRef.current.setNowPlaying?.(null);
      }
      // NOTE: attempt() never rejects: every await lives inside the
      // try/catch above and the mapper is total, so `void attempt(...)`
      // callers need no .catch. If an await is ever added outside the
      // try block, this guarantee must be revisited.
    },
    [updatePlayerState],
  );

  const firstUrl = urls[0];

  useEffect(() => {
    if (!autoplay) {
      return;
    }

    void attempt(firstUrl);

    return () => {
      runRef.current++;
    };
  }, [attempt, autoplay, firstUrl]);

  const play = useCallback(() => {
    void attempt(urlsRef.current[0]);
  }, [attempt]);

  useEffect(() => {
    const subscribe = driver.subscribePlayback;
    if (!subscribe) {
      return;
    }
    return subscribe(({ playing }) => {
      if (playing && statusRef.current === "paused") {
        updatePlayerState("playing");
      } else if (!playing && statusRef.current === "playing") {
        updatePlayerState("paused");
      }
    });
  }, [driver, updatePlayerState]);

  const nowPlayingTitle = nowPlaying?.title;
  const nowPlayingArtist = nowPlaying?.artist;

  useEffect(() => {
    if (!nowPlayingTitle) {
      return;
    }
    if (statusRef.current !== "playing" && statusRef.current !== "paused") {
      return;
    }
    driverRef.current.setNowPlaying?.({ title: nowPlayingTitle, artist: nowPlayingArtist });
  }, [nowPlayingTitle, nowPlayingArtist]);

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
