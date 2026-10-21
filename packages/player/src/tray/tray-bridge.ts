import type { TrayMenuModel } from "./tray-menu-model";

export type Unsubscribe = () => void;

export type TrayBridge = {
  readonly publish: (model: TrayMenuModel) => void | Promise<void>;
  readonly onTogglePlayback: (listener: () => void) => Unsubscribe;
  readonly onSelectStation: (listener: (stationId: string) => void) => Unsubscribe;
};
