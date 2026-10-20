export type { MediaErrorDetail, MediaErrorKey, MediaFailure } from "./errors/errors";
export { describeMediaError, narrowFailure } from "./errors/errors";
export { STREAM_FALLBACK_URLS } from "./fallback/streams";
export type { PlayerStatus } from "./status";
export type { TrayBridge, Unsubscribe } from "./tray/tray-bridge";
export type {
  TrayLabels,
  TrayMenuModel,
  TrayStation,
  TrayStationEntry,
} from "./tray/tray-menu-model";
export { buildTrayMenuModel } from "./tray/tray-menu-model";
export type { UseTraySyncInput } from "./tray/use-tray-sync";
export { useTraySync } from "./tray/use-tray-sync";
export type {
  AudioDriver,
  AudioDriverEvent,
  NowPlayingMetadata,
  UsePlayerProps,
  UsePlayerReturn,
} from "./use-player/use-player";
export { usePlayer } from "./use-player/use-player";
