import type { TrayBridge } from "./tray-bridge";

const ignore = (): void => undefined;

export const noopTrayBridge: TrayBridge = {
  publish: ignore,
  readCloseToTray: () => false,
  writeCloseToTray: ignore,
  onTogglePlayback: () => ignore,
  onSelectStation: () => ignore,
  onToggleCloseToTray: () => ignore,
};
