// @vitest-environment node

import {
  loadPersistedTheme,
  loadPersistedThemeAsync,
  savePersistedTheme,
  savePersistedThemeAsync,
  THEME_STORAGE_KEY,
  type ThemeStore,
} from "@aqui-suena/ui/state/theme";
import { describe, expect, it } from "vitest";

function makeStore(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };

  return {
    data,
    getItem: (key: string) => (key in data ? (data[key] ?? null) : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

function makeAsyncStore(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };

  return {
    data,
    getItem: async (key: string) => (key in data ? (data[key] ?? null) : null),
    setItem: async (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe("loadPersistedTheme", () => {
  it("returns undefined when no store is given or the value is invalid", () => {
    expect(loadPersistedTheme()).toBeUndefined();
    expect(loadPersistedTheme(makeStore({ [THEME_STORAGE_KEY]: "neon" }))).toBeUndefined();
  });

  it("returns the stored theme", () => {
    expect(loadPersistedTheme(makeStore({ [THEME_STORAGE_KEY]: "brasa" }))).toBe("brasa");
  });

  it("does not throw when the store throws", () => {
    const store: ThemeStore = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {},
    };

    expect(loadPersistedTheme(store)).toBeUndefined();
  });
});

describe("savePersistedTheme", () => {
  it("writes the theme and tolerates missing or throwing stores", () => {
    const store = makeStore();

    savePersistedTheme(store, "brasa");
    expect(store.data[THEME_STORAGE_KEY]).toBe("brasa");

    expect(() => savePersistedTheme(undefined, "noche")).not.toThrow();
    expect(() =>
      savePersistedTheme(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error("denied");
          },
        },
        "noche",
      ),
    ).not.toThrow();
  });
});

describe("async theme persistence", () => {
  it("loads and saves through the async store", async () => {
    const store = makeAsyncStore({ [THEME_STORAGE_KEY]: "noche" });

    await expect(loadPersistedThemeAsync(store)).resolves.toBe("noche");
    await savePersistedThemeAsync(store, "brasa");
    await expect(loadPersistedThemeAsync(store)).resolves.toBe("brasa");
  });
});
