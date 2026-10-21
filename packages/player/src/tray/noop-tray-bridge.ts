import type { TrayBridge } from "./tray-bridge";

const ignore = (): void => undefined;

export const noopTrayBridge: TrayBridge = {
  publish: ignore,
  onTogglePlayback: () => ignore,
  onSelectStation: () => ignore,
};
