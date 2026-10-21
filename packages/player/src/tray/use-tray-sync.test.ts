// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TrayBridge } from "./tray-bridge";
import type { TrayLabels, TrayMenuModel, TrayStation } from "./tray-menu-model";
import { type UseTraySyncInput, useTraySync } from "./use-tray-sync";

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const labels: TrayLabels = {
  play: "Reproducir",
  pause: "Pausar",
  stations: "Estaciones",
  closeToTray: "Cerrar a la bandeja",
  toggleWindow: "Mostrar/Ocultar ventana",
  quit: "Salir",
};

const stations: readonly TrayStation[] = [
  { id: "test-pop", name: "Test Pop" },
  { id: "test-jingle", name: "Test Jingle" },
];

function createFakeBridge(initialCloseToTray = false) {
  const published: TrayMenuModel[] = [];
  const toggleListeners = new Set<() => void>();
  const stationListeners = new Set<(stationId: string) => void>();
  const closeToTrayListeners = new Set<() => void>();
  let toggleAttaches = 0;
  let storedCloseToTray = initialCloseToTray;

  const bridge: TrayBridge = {
    publish: (model) => {
      published.push(model);
    },
    readCloseToTray: () => storedCloseToTray,
    writeCloseToTray: (value) => {
      storedCloseToTray = value;
    },
    onTogglePlayback: (listener) => {
      toggleAttaches += 1;
      toggleListeners.add(listener);
      return () => {
        toggleListeners.delete(listener);
      };
    },
    onSelectStation: (listener) => {
      stationListeners.add(listener);
      return () => {
        stationListeners.delete(listener);
      };
    },
    onToggleCloseToTray: (listener) => {
      closeToTrayListeners.add(listener);
      return () => {
        closeToTrayListeners.delete(listener);
      };
    },
  };

  return {
    bridge,
    published,
    storedCloseToTray: () => storedCloseToTray,
    listenerCount: () => toggleListeners.size + stationListeners.size + closeToTrayListeners.size,
    toggleAttachCount: () => toggleAttaches,
    triggerToggle: () => {
      for (const listener of toggleListeners) {
        listener();
      }
    },
    triggerSelect: (stationId: string) => {
      for (const listener of stationListeners) {
        listener(stationId);
      }
    },
    triggerCloseToTray: () => {
      for (const listener of closeToTrayListeners) {
        listener();
      }
    },
  };
}

function renderTraySync(overrides: Partial<UseTraySyncInput> = {}) {
  const fake = createFakeBridge();
  const onTogglePlayback = vi.fn();
  const onSelectStation = vi.fn();
  const input: UseTraySyncInput = {
    bridge: fake.bridge,
    status: "playing",
    labels,
    stations,
    activeStationId: "test-pop",
    onTogglePlayback,
    onSelectStation,
    ...overrides,
  };

  const rendered = renderHook((props: UseTraySyncInput) => useTraySync(props), {
    initialProps: input,
  });

  return { ...fake, onTogglePlayback, onSelectStation, input, ...rendered };
}

describe("useTraySync", () => {
  it("publishes the menu model on mount", () => {
    const { published } = renderTraySync();

    expect(published).toHaveLength(1);
    expect(published[0]?.toggle.label).toBe("Pausar");
    expect(published[0]?.stations.items[1]?.active).toBe(false);
  });

  it("republishes when the status changes", () => {
    const { rerender, published, input } = renderTraySync();

    rerender({ ...input, status: "paused" });

    expect(published).toHaveLength(2);
    expect(published[1]?.toggle.label).toBe("Reproducir");
  });

  it("does not republish when nothing changed", () => {
    const { rerender, published, input } = renderTraySync();

    rerender(input);

    expect(published).toHaveLength(1);
  });

  it("forwards the toggle to the caller", () => {
    const { triggerToggle, onTogglePlayback } = renderTraySync();

    act(() => {
      triggerToggle();
    });

    expect(onTogglePlayback).toHaveBeenCalledTimes(1);
  });

  it("forwards the selected station id", () => {
    const { triggerSelect, onSelectStation } = renderTraySync();

    act(() => {
      triggerSelect("test-jingle");
    });

    expect(onSelectStation).toHaveBeenCalledWith("test-jingle");
  });

  it("restores the stored close behaviour in the first model", () => {
    const fake = createFakeBridge(true);

    renderTraySync({ bridge: fake.bridge });

    expect(fake.published[0]?.closeToTray).toEqual({
      label: "Cerrar a la bandeja",
      checked: true,
    });
  });

  it("flips and persists the close behaviour when the tray asks", () => {
    const { triggerCloseToTray, published, storedCloseToTray } = renderTraySync();

    act(() => {
      triggerCloseToTray();
    });

    expect(storedCloseToTray()).toBe(true);
    expect(published[published.length - 1]?.closeToTray.checked).toBe(true);
  });

  it("publishes the flip back instead of trusting the tray's own check state", () => {
    const { triggerCloseToTray, published } = renderTraySync();

    act(() => {
      triggerCloseToTray();
    });
    act(() => {
      triggerCloseToTray();
    });

    expect(published[published.length - 1]?.closeToTray.checked).toBe(false);
  });

  it("unsubscribes on unmount", () => {
    const {
      unmount,
      triggerToggle,
      triggerSelect,
      onTogglePlayback,
      onSelectStation,
      listenerCount,
    } = renderTraySync();

    unmount();
    triggerToggle();
    triggerSelect("test-jingle");

    expect(onTogglePlayback).not.toHaveBeenCalled();
    expect(onSelectStation).not.toHaveBeenCalled();
    expect(listenerCount()).toBe(0);
  });

  it("republishes when the labels change", () => {
    const { rerender, published, input } = renderTraySync();

    rerender({ ...input, labels: { ...labels, play: "Play", pause: "Pause" } });

    expect(published).toHaveLength(2);
    expect(published[1]?.toggle.label).toBe("Pause");
  });

  it("republishes when the active station changes", () => {
    const { rerender, published, input } = renderTraySync();

    rerender({ ...input, activeStationId: "test-jingle" });

    expect(published).toHaveLength(2);
    expect(published[1]?.stations.items[1]?.active).toBe(true);
  });

  it("replaces the listener when the callback changes", () => {
    const { rerender, triggerToggle, input, onTogglePlayback } = renderTraySync();
    const nextToggle = vi.fn();

    rerender({ ...input, onTogglePlayback: nextToggle });

    act(() => {
      triggerToggle();
    });

    expect(onTogglePlayback).not.toHaveBeenCalled();
    expect(nextToggle).toHaveBeenCalledTimes(1);
  });

  it("keeps a single subscription when only the callback identity changes", () => {
    const { rerender, input, toggleAttachCount } = renderTraySync();

    rerender({ ...input, onTogglePlayback: vi.fn() });
    rerender({ ...input, onTogglePlayback: vi.fn() });

    expect(toggleAttachCount()).toBe(1);
  });

  it("reports a rejected publish instead of leaving it unhandled", async () => {
    const failure = new Error("emit rejected");
    const report = vi.spyOn(console, "error").mockImplementation(() => {});
    const bridge: TrayBridge = {
      ...createFakeBridge().bridge,
      publish: () => Promise.reject(failure),
    };

    renderTraySync({ bridge });

    await act(async () => {
      await flush();
    });

    expect(report).toHaveBeenCalledWith(
      "tray menu publish failed; the tray menu is stale",
      failure,
    );
    report.mockRestore();
  });

  it("does not republish an equal model carried by a new labels identity", () => {
    const { rerender, published, input } = renderTraySync();

    rerender({ ...input, labels: { ...labels } });

    expect(published).toHaveLength(1);
  });
});
