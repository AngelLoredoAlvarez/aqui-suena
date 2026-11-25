import { browserStorage, isTauriRuntime } from "@aqui-suena/web/app/tray-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("tray-runtime", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("browserStorage", () => {
    it("returns null when there is no window", () => {
      expect(browserStorage()).toBeNull();
    });

    it("returns localStorage when the window provides it", () => {
      const storage = { getItem: () => null, setItem: () => {} };
      vi.stubGlobal("window", { localStorage: storage });

      expect(browserStorage()).toBe(storage);
    });

    it("returns null when reading localStorage throws", () => {
      const blocked = {};
      Object.defineProperty(blocked, "localStorage", {
        get() {
          throw new Error("storage blocked");
        },
      });
      vi.stubGlobal("window", blocked);

      expect(browserStorage()).toBeNull();
    });
  });

  describe("isTauriRuntime", () => {
    it("is false without a window", () => {
      expect(isTauriRuntime()).toBe(false);
    });

    it("is false when the window has no tauri marker", () => {
      vi.stubGlobal("window", {});

      expect(isTauriRuntime()).toBe(false);
    });

    it("is true when the window has the tauri marker", () => {
      vi.stubGlobal("window", { isTauri: true });

      expect(isTauriRuntime()).toBe(true);
    });
  });
});
