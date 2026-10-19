export type { MediaErrorDetail, MediaErrorKey, MediaFailure } from "./errors/errors";
export { describeMediaError, narrowFailure } from "./errors/errors";
export { STREAM_FALLBACK_URLS } from "./fallback/streams";
export type {
  AudioDriver,
  AudioDriverEvent,
  NowPlayingMetadata,
  PlayerStatus,
  UsePlayerProps,
  UsePlayerReturn,
} from "./use-player/use-player";
export { usePlayer } from "./use-player/use-player";
