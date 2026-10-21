import type { TrayBridge, TrayMenuModel, Unsubscribe } from "@aqui-suena/player";
import { cancelSafeSubscribe, noopTrayBridge } from "@aqui-suena/player";
import { emit, listen } from "@tauri-apps/api/event";

const MENU_EVENT = "tray-menu";
const TOGGLE_EVENT = "tray-toggle";
const SELECT_STATION_EVENT = "tray-select-station";
const TOGGLE_CLOSE_TO_TRAY_EVENT = "tray-toggle-close-to-tray";

const CLOSE_TO_TRAY_STORAGE_KEY = "aqui-suena:close-to-tray";

// Closing to the tray is what keeps a radio playing, so it is the behaviour
// until the user says otherwise.
const DEFAULT_CLOSE_TO_TRAY = true;

const readStoredCloseToTray = (): boolean => {
  if (typeof window === "undefined") {
    return DEFAULT_CLOSE_TO_TRAY;
  }

  try {
    const stored = window.localStorage.getItem(CLOSE_TO_TRAY_STORAGE_KEY);

    return stored === null ? DEFAULT_CLOSE_TO_TRAY : stored === "true";
  } catch {
    return DEFAULT_CLOSE_TO_TRAY;
  }
};

const writeStoredCloseToTray = (value: boolean): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CLOSE_TO_TRAY_STORAGE_KEY, String(value));
  } catch {
    // A blocked storage write keeps the choice for this session only; the tray
    // still honours it until the app restarts.
  }
};

const tauriTrayBridge: TrayBridge = {
  publish: (model: TrayMenuModel): Promise<void> => emit(MENU_EVENT, model),
  readCloseToTray: readStoredCloseToTray,
  writeCloseToTray: writeStoredCloseToTray,
  onTogglePlayback: (listener: () => void): Unsubscribe =>
    cancelSafeSubscribe(() => listen(TOGGLE_EVENT, () => listener())),
  onSelectStation: (listener: (stationId: string) => void): Unsubscribe =>
    cancelSafeSubscribe(() =>
      listen<string>(SELECT_STATION_EVENT, (event) => listener(event.payload)),
    ),
  onToggleCloseToTray: (listener: () => void): Unsubscribe =>
    cancelSafeSubscribe(() => listen(TOGGLE_CLOSE_TO_TRAY_EVENT, () => listener())),
};

const isTauriRuntime = (): boolean => typeof window !== "undefined" && "isTauri" in window;

export const trayBridge: TrayBridge = isTauriRuntime() ? tauriTrayBridge : noopTrayBridge;
