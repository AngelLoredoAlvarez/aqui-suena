import { useEffect, useState } from "react";

export const PULSE_INTERVAL_MS = 1600;

export function usePulse(isPlaying: boolean): boolean {
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (!isPlaying) {
      setPulsing(false);
      return;
    }

    setPulsing(true);

    const id = setInterval(() => setPulsing((p) => !p), PULSE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [isPlaying]);

  return pulsing;
}
