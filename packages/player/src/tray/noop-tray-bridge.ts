import type { TrayBridge } from "@aqui-suena/player/tray/tray-bridge";

const ignore = (): void => undefined;

export const noopTrayBridge: TrayBridge = {
  publish: ignore,
  readCloseToTray: () => false,
  writeCloseToTray: ignore,
  onTogglePlayback: () => ignore,
  onSelectStation: () => ignore,
  onToggleCloseToTray: () => ignore,
};
