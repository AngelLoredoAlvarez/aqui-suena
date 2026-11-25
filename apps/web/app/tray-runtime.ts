import type { StringStorage } from "@aqui-suena/player";

// Reading localStorage throws when storage is blocked, so the whole lookup is
// guarded rather than only the read.
export function browserStorage(): StringStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "isTauri" in window;
}
