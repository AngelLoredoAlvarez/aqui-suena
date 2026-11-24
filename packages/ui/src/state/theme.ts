export type ThemePreference = "noche" | "brasa";

export const THEME_STORAGE_KEY = "aqui-suena.theme";

export type ThemeStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export type AsyncThemeStore = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

function isValidTheme(raw: string | null): raw is ThemePreference {
  return raw === "noche" || raw === "brasa";
}

export function loadPersistedTheme(store?: ThemeStore): ThemePreference | undefined {
  try {
    const raw = store?.getItem(THEME_STORAGE_KEY) ?? null;

    return isValidTheme(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
}

export function savePersistedTheme(store: ThemeStore | undefined, theme: ThemePreference): void {
  try {
    store?.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

export async function loadPersistedThemeAsync(
  store?: AsyncThemeStore,
): Promise<ThemePreference | undefined> {
  try {
    const raw = store === undefined ? null : await store.getItem(THEME_STORAGE_KEY);

    return isValidTheme(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
}

export async function savePersistedThemeAsync(
  store: AsyncThemeStore | undefined,
  theme: ThemePreference,
): Promise<void> {
  try {
    await store?.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}
