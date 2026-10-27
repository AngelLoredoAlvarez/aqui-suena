// Shared classification of driver failures onto the player's MediaFailure
// contract. Both the web and native expo-audio drivers map their distinct
// error shapes onto the same { name?, code? } form so usePlayer can treat
// them uniformly.

export type MediaFailure = { readonly name?: string; readonly code?: number };

// Web driver: failures arrive as thrown Error objects from HTMLAudioElement.play().
export function toWebFailure(error: unknown): MediaFailure {
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

// Native driver: failures arrive as expo-audio status error strings.
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
