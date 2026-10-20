import type { PlayerStatus } from "@aqui-suena/player";
import { describe, expect, it } from "vitest";
import { buildTrayMenuModel, type TrayLabels, type TrayStation } from "./tray-menu-model";

const labels: TrayLabels = {
  play: "Reproducir",
  pause: "Pausar",
  stations: "Estaciones",
  toggleWindow: "Mostrar/Ocultar ventana",
  quit: "Salir",
};

const stations: readonly TrayStation[] = [
  { id: "test-pop", name: "Test Pop" },
  { id: "test-jingle", name: "Test Jingle" },
];

const baseInput = {
  labels,
  stations,
  activeStationId: "test-pop",
};

const playStates: readonly PlayerStatus[] = ["idle", "paused", "blocked", "error"];

describe("buildTrayMenuModel", () => {
  it("offers pause and stays enabled while playing", () => {
    const model = buildTrayMenuModel({ ...baseInput, status: "playing" });

    expect(model.toggle.label).toBe("Pausar");
    expect(model.toggle.enabled).toBe(true);
  });

  it("offers play but disables it while loading", () => {
    const model = buildTrayMenuModel({ ...baseInput, status: "loading" });

    expect(model.toggle.label).toBe("Reproducir");
    expect(model.toggle.enabled).toBe(false);
  });

  it.each(playStates)("offers play enabled while %s", (status) => {
    const model = buildTrayMenuModel({ ...baseInput, status });

    expect(model.toggle.label).toBe("Reproducir");
    expect(model.toggle.enabled).toBe(true);
  });

  it("marks only the active station", () => {
    const model = buildTrayMenuModel({ ...baseInput, status: "playing" });

    expect(model.stations.items).toEqual([
      { id: "test-pop", name: "Test Pop", active: true },
      { id: "test-jingle", name: "Test Jingle", active: false },
    ]);
  });

  it("uses every label it receives", () => {
    const model = buildTrayMenuModel({
      ...baseInput,
      status: "paused",
      labels: { ...labels, play: "Play", pause: "Pause", stations: "Stations", quit: "Quit" },
    });

    expect(model.toggle.label).toBe("Play");
    expect(model.stations.label).toBe("Stations");
    expect(model.toggleWindow.label).toBe("Mostrar/Ocultar ventana");
    expect(model.quit.label).toBe("Quit");
  });

  it("does not mutate the stations it receives", () => {
    buildTrayMenuModel({ ...baseInput, status: "playing" });

    expect(stations).toEqual([
      { id: "test-pop", name: "Test Pop" },
      { id: "test-jingle", name: "Test Jingle" },
    ]);
  });
});
