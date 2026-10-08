export type MediaFailure = {
  readonly name?: string;
  readonly code?: number;
};

export type MediaErrorDetail = {
  readonly status: "blocked" | "error";
  readonly message: string;
};

const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

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
