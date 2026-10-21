import type { TrayBridge, TrayMenuModel, Unsubscribe } from "@aqui-suena/player";
import { cancelSafeSubscribe, noopTrayBridge } from "@aqui-suena/player";
import { emit, listen } from "@tauri-apps/api/event";

const MENU_EVENT = "tray-menu";
const TOGGLE_EVENT = "tray-toggle";
const SELECT_STATION_EVENT = "tray-select-station";

const tauriTrayBridge: TrayBridge = {
  publish: (model: TrayMenuModel): void => {
    void emit(MENU_EVENT, model);
  },
  onTogglePlayback: (listener: () => void): Unsubscribe =>
    cancelSafeSubscribe(() => listen(TOGGLE_EVENT, () => listener())),
  onSelectStation: (listener: (stationId: string) => void): Unsubscribe =>
    cancelSafeSubscribe(() =>
      listen<string>(SELECT_STATION_EVENT, (event) => listener(event.payload)),
    ),
};

const isTauriRuntime = (): boolean => typeof window !== "undefined" && "isTauri" in window;

export const trayBridge: TrayBridge = isTauriRuntime() ? tauriTrayBridge : noopTrayBridge;
