import type {
  AudioDriver,
  AudioDriverEvent,
  MediaFailure,
  NowPlayingMetadata,
} from "@aqui-suena/player";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useCallback, useEffect, useMemo, useRef } from "react";

type NativePlayer = ReturnType<typeof useAudioPlayer>;

type PendingPlay = {
  resolve: () => void;
  reject: (reason: unknown) => void;
  token: number;
  target: NativePlayer;
  previous: NativePlayer | null;
};

const LOCK_SCREEN_OPTIONS = {
  isLiveStream: true,
  showSeekForward: false,
  showSeekBackward: false,
  showNextTrack: false,
  showPreviousTrack: false,
} as const;

// Map expo-audio status errors onto the player failure contract. Blocked
// autoplay must surface as NotAllowedError so usePlayer shows resume;
// anything else stays generic so mirror rotation engages.
export function toMediaFailure(audioError: string | null): MediaFailure {
  if (!audioError) {
    return {};
  }
  if (/not.?allowed|play.?interrupted|user.?gesture/i.test(audioError)) {
    return { name: "NotAllowedError" };
  }
  if (/not.?supported|format|mime|decode|src/i.test(audioError)) {
    return { code: 4 };
  }
  return {};
}

function metadataKey(metadata: NowPlayingMetadata): string {
  return `${metadata.title}\u0000${metadata.artist ?? ""}`;
}

function activateLockScreen(player: NativePlayer, metadata: NowPlayingMetadata): void {
  player.setActiveForLockScreen(
    true,
    { title: metadata.title, artist: metadata.artist },
    LOCK_SCREEN_OPTIONS,
  );
}

// Shared expo-audio driver for web and native: expo-audio play() is sync
// and failures arrive later as status events, so this bridges one status
// transition per play() call into the promise-based AudioDriver contract.
// Statuses with neither playing nor error leave the call pending; the only
// producer of those is the mocked module in tests.
export function useExpoAudioDriver(): AudioDriver {
  const first = useAudioPlayer(null);
  const second = useAudioPlayer(null);
  const firstStatus = useAudioPlayerStatus(first);
  const secondStatus = useAudioPlayerStatus(second);
  const currentRef = useRef<NativePlayer | null>(null);
  const latestRef = useRef<NativePlayer | null>(null);
  const pendingsRef = useRef(new Map<NativePlayer, PendingPlay>());
  const playTokenRef = useRef(0);
  const listenersRef = useRef(new Set<(event: AudioDriverEvent) => void>());
  const lastPlayingRef = useRef(false);
  const activeRef = useRef<{ player: NativePlayer; key: string } | null>(null);

  const publish = useCallback((player: NativePlayer, metadata: NowPlayingMetadata): void => {
    const key = metadataKey(metadata);
    const active = activeRef.current;
    if (active?.player === player) {
      if (active.key !== key) {
        player.updateLockScreenMetadata({ title: metadata.title, artist: metadata.artist });
        activeRef.current = { player, key };
      }
      return;
    }
    activateLockScreen(player, metadata);
    activeRef.current = { player, key };
  }, []);

  const release = useCallback((player: NativePlayer | null): void => {
    if (!player) {
      return;
    }
    player.clearLockScreenControls();
    if (activeRef.current?.player === player) {
      activeRef.current = null;
    }
  }, []);

  useEffect(() => {
    const statusByPlayer = new Map<NativePlayer, { playing: boolean; error: string | null }>([
      [first, firstStatus],
      [second, secondStatus],
    ]);
    for (const [target, pending] of pendingsRef.current) {
      const targetStatus = statusByPlayer.get(target);
      if (!targetStatus || (!targetStatus.error && !targetStatus.playing)) {
        continue;
      }
      pendingsRef.current.delete(target);
      if (targetStatus.error) {
        pending.reject(toMediaFailure(targetStatus.error));
        continue;
      }
      if (playTokenRef.current === pending.token) {
        if (pending.previous && pending.previous !== pending.target) {
          release(pending.previous);
        }
        pending.previous?.pause();
        currentRef.current = pending.target;
        lastPlayingRef.current = true;
      } else {
        pending.target.pause();
      }
      pending.resolve();
    }
  }, [first, firstStatus, publish, release, second, secondStatus]);

  useEffect((): void => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
  }, []);

  const firstPlaying = firstStatus.playing;
  const secondPlaying = secondStatus.playing;

  useEffect((): void => {
    const current = currentRef.current;
    if (!current) {
      return;
    }
    const playing = current === first ? firstPlaying : secondPlaying;
    if (playing === lastPlayingRef.current) {
      return;
    }
    lastPlayingRef.current = playing;
    for (const listener of listenersRef.current) {
      listener({ playing });
    }
  }, [first, firstPlaying, second, secondPlaying]);

  return useMemo<AudioDriver>(
    () => ({
      play: (url: string) =>
        new Promise<void>((resolve, reject) => {
          const previous = currentRef.current ?? latestRef.current;
          const target = latestRef.current === first ? second : first;
          const token = ++playTokenRef.current;
          latestRef.current = target;
          pendingsRef.current.set(target, { resolve, reject, token, target, previous });
          target.replace(url);
          target.play();
        }),
      pause: () => {
        currentRef.current?.pause();
      },
      setNowPlaying: (metadata: NowPlayingMetadata | null) => {
        const current = currentRef.current;
        if (!current) {
          return;
        }
        if (!metadata) {
          release(current);
          return;
        }
        publish(current, metadata);
      },
      subscribePlayback: (listener: (event: AudioDriverEvent) => void) => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [first, publish, release, second],
  );
}
