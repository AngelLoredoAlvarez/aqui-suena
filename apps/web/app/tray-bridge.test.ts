import type { TrayMenuModel } from "@aqui-suena/player";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted so the vi.mock factories can reference these before the test body runs.
const mocks = vi.hoisted(() => {
  const noopTrayBridge = {
    publish: () => undefined,
    readCloseToTray: () => false,
    writeCloseToTray: () => undefined,
    onTogglePlayback: () => () => undefined,
    onSelectStation: () => () => undefined,
    onToggleCloseToTray: () => () => undefined,
  };

  return {
    emit: vi.fn(),
    listen: vi.fn(),
    isTauriRuntime: vi.fn(),
    browserStorage: vi.fn(),
    readStoredCloseToTray: vi.fn(),
    writeStoredCloseToTray: vi.fn(),
    cancelSafeSubscribe: vi.fn((attach: () => Promise<() => void>) => {
      void attach();
      return () => undefined;
    }),
    noopTrayBridge,
  };
});

vi.mock("@tauri-apps/api/event", () => ({
  emit: mocks.emit,
  listen: mocks.listen,
}));

vi.mock("@aqui-suena/web/app/tray-runtime", () => ({
  browserStorage: mocks.browserStorage,
  isTauriRuntime: mocks.isTauriRuntime,
}));

vi.mock("@aqui-suena/player", () => ({
  cancelSafeSubscribe: mocks.cancelSafeSubscribe,
  noopTrayBridge: mocks.noopTrayBridge,
  readStoredCloseToTray: mocks.readStoredCloseToTray,
  writeStoredCloseToTray: mocks.writeStoredCloseToTray,
}));

describe("tray-bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("uses the noop bridge when not running under Tauri", async () => {
    mocks.isTauriRuntime.mockReturnValue(false);

    const { trayBridge } = await import("@aqui-suena/web/app/tray-bridge");

    expect(trayBridge).toBe(mocks.noopTrayBridge);
  });

  describe("when running under Tauri", () => {
    beforeEach(() => {
      mocks.isTauriRuntime.mockReturnValue(true);
      mocks.listen.mockResolvedValue(() => undefined);
    });

    it("publishes the menu model through the tauri emit", async () => {
      const { trayBridge } = await import("@aqui-suena/web/app/tray-bridge");
      const model = {} as TrayMenuModel;

      await trayBridge.publish(model);

      expect(mocks.emit).toHaveBeenCalledWith("tray-menu", model);
    });

    it("reads and writes close-to-tray through the runtime storage", async () => {
      const { trayBridge } = await import("@aqui-suena/web/app/tray-bridge");
      const storage = { getItem: () => null, setItem: () => undefined };
      mocks.browserStorage.mockReturnValue(storage);
      mocks.readStoredCloseToTray.mockReturnValue(true);

      expect(trayBridge.readCloseToTray()).toBe(true);
      expect(mocks.readStoredCloseToTray).toHaveBeenCalledWith(storage);

      trayBridge.writeCloseToTray(false);
      expect(mocks.writeStoredCloseToTray).toHaveBeenCalledWith(storage, false);
    });

    it("subscribes playback through the tauri toggle event", async () => {
      const { trayBridge } = await import("@aqui-suena/web/app/tray-bridge");
      const onTogglePlayback = vi.fn();

      trayBridge.onTogglePlayback(onTogglePlayback);

      expect(mocks.listen).toHaveBeenCalledWith("tray-toggle", expect.any(Function));
      const handler = mocks.listen.mock.calls[0]?.[1] as () => void;
      handler();
      expect(onTogglePlayback).toHaveBeenCalledTimes(1);
    });

    it("maps the selected station id through the tauri station event", async () => {
      const { trayBridge } = await import("@aqui-suena/web/app/tray-bridge");
      const onSelectStation = vi.fn();

      trayBridge.onSelectStation(onSelectStation);

      expect(mocks.listen).toHaveBeenCalledWith("tray-select-station", expect.any(Function));
      const handler = mocks.listen.mock.calls[0]?.[1] as (event: { payload: string }) => void;
      handler({ payload: "station-1" });
      expect(onSelectStation).toHaveBeenCalledWith("station-1");
    });

    it("subscribes close-to-tray through the tauri close event", async () => {
      const { trayBridge } = await import("@aqui-suena/web/app/tray-bridge");
      const onToggleCloseToTray = vi.fn();

      trayBridge.onToggleCloseToTray(onToggleCloseToTray);

      expect(mocks.listen).toHaveBeenCalledWith("tray-toggle-close-to-tray", expect.any(Function));
      const handler = mocks.listen.mock.calls[0]?.[1] as () => void;
      handler();
      expect(onToggleCloseToTray).toHaveBeenCalledTimes(1);
    });
  });
});
