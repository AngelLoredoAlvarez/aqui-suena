export const CLOSE_TO_TRAY_STORAGE_KEY = "aqui-suena:close-to-tray";

// Closing to the tray is what keeps a radio playing, so it is the behaviour
// until the user says otherwise. The native side mirrors this default, and a
// Rust test keeps both values from drifting apart.
export const DEFAULT_CLOSE_TO_TRAY = true;

// The slice of the Storage API this module needs, so it can run against
// localStorage, a fake, or nothing at all.
export type StringStorage = {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
};

export function readStoredCloseToTray(storage: StringStorage | null): boolean {
  if (storage === null) {
    return DEFAULT_CLOSE_TO_TRAY;
  }

  try {
    const stored = storage.getItem(CLOSE_TO_TRAY_STORAGE_KEY);

    if (stored === "true") {
      return true;
    }

    if (stored === "false") {
      return false;
    }

    return DEFAULT_CLOSE_TO_TRAY;
  } catch {
    return DEFAULT_CLOSE_TO_TRAY;
  }
}

export function writeStoredCloseToTray(storage: StringStorage | null, value: boolean): void {
  if (storage === null) {
    return;
  }

  try {
    storage.setItem(CLOSE_TO_TRAY_STORAGE_KEY, String(value));
  } catch {
    // A blocked storage write keeps the choice for this session only; the tray
    // still honours it until the app restarts.
  }
}
