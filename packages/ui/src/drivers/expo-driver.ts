import type { AudioDriver } from "@aqui-suena/player";
import { useMemo, useRef } from "react";

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

// Remote mirror hosts answer 403 to browser Referer headers, so remote
// URLs play through our same-origin /api/stream proxy (which strips them
// server-side). Same-origin dev paths need no proxy and play directly.
function isSameOriginPath(url: string): boolean {
  return url.startsWith("/");
}

export function useExpoAudioDriver(): AudioDriver {
  const elementRef = useRef<HTMLAudioElement | null>(null);

  return useMemo<AudioDriver>(
    () => ({
      play: (url: string) => {
        const element = elementRef.current ?? new Audio();
        elementRef.current = element;
        element.src = isSameOriginPath(url) ? url : `/api/stream?url=${encodeURIComponent(url)}`;
        return element.play().catch((error: unknown) => {
          throw toWebFailure(error);
        });
      },
      pause: () => {
        elementRef.current?.pause();
      },
    }),
    [],
  );
}
