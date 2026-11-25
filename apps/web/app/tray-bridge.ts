import type { TrayBridge, TrayMenuModel, Unsubscribe } from "@aqui-suena/player";
import {
  cancelSafeSubscribe,
  noopTrayBridge,
  readStoredCloseToTray,
  writeStoredCloseToTray,
} from "@aqui-suena/player";
import { browserStorage, isTauriRuntime } from "@aqui-suena/web/app/tray-runtime";
import { emit, listen } from "@tauri-apps/api/event";

const MENU_EVENT = "tray-menu";
const TOGGLE_EVENT = "tray-toggle";
const SELECT_STATION_EVENT = "tray-select-station";
const TOGGLE_CLOSE_TO_TRAY_EVENT = "tray-toggle-close-to-tray";

const tauriTrayBridge: TrayBridge = {
  publish: (model: TrayMenuModel): Promise<void> => emit(MENU_EVENT, model),
  readCloseToTray: (): boolean => readStoredCloseToTray(browserStorage()),
  writeCloseToTray: (value: boolean): void => {
    writeStoredCloseToTray(browserStorage(), value);
  },
  onTogglePlayback: (listener: () => void): Unsubscribe =>
    cancelSafeSubscribe(() => listen(TOGGLE_EVENT, () => listener())),
  onSelectStation: (listener: (stationId: string) => void): Unsubscribe =>
    cancelSafeSubscribe(() =>
      listen<string>(SELECT_STATION_EVENT, (event) => listener(event.payload)),
    ),
  onToggleCloseToTray: (listener: () => void): Unsubscribe =>
    cancelSafeSubscribe(() => listen(TOGGLE_CLOSE_TO_TRAY_EVENT, () => listener())),
};

export const trayBridge: TrayBridge = isTauriRuntime() ? tauriTrayBridge : noopTrayBridge;
