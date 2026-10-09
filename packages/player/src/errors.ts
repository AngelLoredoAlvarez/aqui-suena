export type MediaFailure = {
  readonly name?: string;
  readonly code?: number;
};

export type MediaErrorDetail = {
  readonly status: "blocked" | "error";
  readonly message: string;
};

const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

// Narrow unknown rejections at the boundary. Drivers may throw anything
// (Error, object, string, null); only shaped failures reach the mapper,
// everything else degrades to a generic failure instead of throwing.
export function narrowFailure(error: unknown): MediaFailure {
  if (typeof error === "object" && error !== null) {
    const { name, code } = error as { name?: unknown; code?: unknown };
    return {
      name: typeof name === "string" ? name : undefined,
      code: typeof code === "number" ? code : undefined,
    };
  }
  return {};
}

export function describeMediaError({ name, code }: MediaFailure): MediaErrorDetail {
  if (name === "NotAllowedError") {
    return {
      status: "blocked",
      message: "Autoplay was blocked. Tap to enable sound.",
    };
  }

  if (code === MEDIA_ERR_SRC_NOT_SUPPORTED) {
    return {
      status: "error",
      message: "Signal unavailable, trying mirror…",
    };
  }

  return {
    status: "error",
    message: "Playback failed.",
  };
}
