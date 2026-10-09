import type { AudioDriver } from "@aqui-suena/player";
import { useMemo, useRef } from "react";

// Web driver over the platform HTMLAudio element. Unlike the native expo
// build, playback failures surface as real MediaError rejections, so no
// status-event bridge is needed: element.play() rejects with NotAllowedError
// when autoplay is blocked and NotSupportedError for unloadable sources.
//
// Playback goes through our same-origin /api/stream proxy (see
// fetchProxiedStream): mirror hosts answer 403 to browser Referer headers,
// and the proxy strips them server-side.
export function useExpoAudioDriver(): AudioDriver {
  const elementRef = useRef<HTMLAudioElement | null>(null);

  return useMemo<AudioDriver>(
    () => ({
      play: (url: string) => {
        const element = elementRef.current ?? new Audio();
        elementRef.current = element;
        element.src = `/api/stream?url=${encodeURIComponent(url)}`;
        return element.play().catch((error: unknown) => {
          throw toWebFailure(error);
        });
      },
    }),
    [],
  );
}

function toWebFailure(error: unknown): { name?: string; code?: number } {
  if (typeof error === "object" && error !== null) {
    const { name, code } = error as { name?: unknown; code?: unknown };
    if (name === "NotAllowedError") {
      return { name: "NotAllowedError" };
    }
    if (name === "NotSupportedError" || code === 4) {
      return { code: 4 };
    }
  }
  return {};
}
