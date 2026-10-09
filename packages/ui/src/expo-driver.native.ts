import type { AudioDriver, MediaFailure } from "@aqui-suena/player";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useMemo, useRef } from "react";

type PendingPlay = {
  resolve: () => void;
  reject: (reason: unknown) => void;
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
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const pendingRef = useRef<PendingPlay | null>(null);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) {
      return;
    }
    if (status.error) {
      pendingRef.current = null;
      pending.reject(toMediaFailure(status.error));
    } else if (status.playing) {
      pendingRef.current = null;
      pending.resolve();
    }
  }, [status]);

  return useMemo<AudioDriver>(
    () => ({
      play: (url: string) =>
        new Promise<void>((resolve, reject) => {
          pendingRef.current = { resolve, reject };
          player.replace(url);
          player.play();
        }),
    }),
    [player],
  );
}
