import type { AudioDriver, MediaFailure } from "@aqui-suena/player";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useMemo, useRef } from "react";

type NativePlayer = ReturnType<typeof useAudioPlayer>;

type PendingPlay = {
  resolve: () => void;
  reject: (reason: unknown) => void;
  token: number;
  target: NativePlayer;
  previous: NativePlayer | null;
};

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
        pending.previous?.pause();
        currentRef.current = pending.target;
      } else {
        pending.target.pause();
      }
      pending.resolve();
    }
  }, [firstStatus, secondStatus, first, second]);

  useEffect((): void => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
  }, []);

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
    }),
    [first, second],
  );
}
