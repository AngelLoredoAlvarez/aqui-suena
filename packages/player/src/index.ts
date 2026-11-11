export type {
  MediaErrorDetail,
  MediaErrorKey,
  MediaFailure,
} from "@aqui-suena/player/errors/errors";
export { describeMediaError, narrowFailure } from "@aqui-suena/player/errors/errors";
export { STREAM_FALLBACK_URLS } from "@aqui-suena/player/fallback/streams";
export type { PlayerStatus } from "@aqui-suena/player/status";
export { cancelSafeSubscribe } from "@aqui-suena/player/tray/cancel-safe-subscribe";
export {
  CLOSE_TO_TRAY_STORAGE_KEY,
  DEFAULT_CLOSE_TO_TRAY,
  readStoredCloseToTray,
  type StringStorage,
  writeStoredCloseToTray,
} from "@aqui-suena/player/tray/close-to-tray-storage";
export { noopTrayBridge } from "@aqui-suena/player/tray/noop-tray-bridge";
export type { TrayBridge, Unsubscribe } from "@aqui-suena/player/tray/tray-bridge";
export type {
  TrayLabels,
  TrayMenuModel,
  TrayStation,
  TrayStationEntry,
} from "@aqui-suena/player/tray/tray-menu-model";
export { buildTrayMenuModel } from "@aqui-suena/player/tray/tray-menu-model";
export type { UseTraySyncInput } from "@aqui-suena/player/tray/use-tray-sync";
export { useTraySync } from "@aqui-suena/player/tray/use-tray-sync";
export type {
  AudioDriver,
  AudioDriverEvent,
  NowPlayingMetadata,
  UsePlayerProps,
  UsePlayerReturn,
} from "@aqui-suena/player/use-player/use-player";
export { usePlayer } from "@aqui-suena/player/use-player/use-player";
