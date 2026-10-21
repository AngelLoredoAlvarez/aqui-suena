import { describe, expect, it } from "vitest";
import {
  CLOSE_TO_TRAY_STORAGE_KEY,
  DEFAULT_CLOSE_TO_TRAY,
  readStoredCloseToTray,
  type StringStorage,
  writeStoredCloseToTray,
} from "./close-to-tray-storage";

type FakeStorage = StringStorage & { readonly entries: Map<string, string> };

function createStorage(initial: Record<string, string> = {}): FakeStorage {
  const entries = new Map(Object.entries(initial));

  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
}

describe("close-to-tray storage", () => {
  it("defaults to keeping the radio playing when nothing was stored", () => {
    expect(DEFAULT_CLOSE_TO_TRAY).toBe(true);
    expect(readStoredCloseToTray(createStorage())).toBe(true);
  });

  it("reads a stored true back as true", () => {
    const storage = createStorage({ [CLOSE_TO_TRAY_STORAGE_KEY]: "true" });

    expect(readStoredCloseToTray(storage)).toBe(true);
  });

  it("reads a stored false back as false", () => {
    const storage = createStorage({ [CLOSE_TO_TRAY_STORAGE_KEY]: "false" });

    expect(readStoredCloseToTray(storage)).toBe(false);
  });

  it("falls back to the default when the stored value is not a boolean", () => {
    const storage = createStorage({ [CLOSE_TO_TRAY_STORAGE_KEY]: "yes" });

    expect(readStoredCloseToTray(storage)).toBe(DEFAULT_CLOSE_TO_TRAY);
  });

  it("round-trips what it writes", () => {
    const storage = createStorage();

    writeStoredCloseToTray(storage, false);

    expect(storage.entries.get(CLOSE_TO_TRAY_STORAGE_KEY)).toBe("false");
    expect(readStoredCloseToTray(storage)).toBe(false);
  });

  it("keeps the default when storage is unavailable", () => {
    expect(readStoredCloseToTray(null)).toBe(DEFAULT_CLOSE_TO_TRAY);
    expect(() => writeStoredCloseToTray(null, false)).not.toThrow();
  });

  it("keeps the default when storage throws", () => {
    const blocked: StringStorage = {
      getItem: () => {
        throw new Error("storage blocked");
      },
      setItem: () => {
        throw new Error("storage blocked");
      },
    };

    expect(readStoredCloseToTray(blocked)).toBe(DEFAULT_CLOSE_TO_TRAY);
    expect(() => writeStoredCloseToTray(blocked, true)).not.toThrow();
  });
});
