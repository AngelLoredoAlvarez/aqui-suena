import type { PlayerStatus } from "@aqui-suena/player/status";

export type TrayLabels = {
  readonly play: string;
  readonly pause: string;
  readonly stations: string;
  readonly closeToTray: string;
  readonly toggleWindow: string;
  readonly quit: string;
};

export type TrayStation = {
  readonly id: string;
  readonly name: string;
};

export type TrayStationEntry = TrayStation & {
  readonly active: boolean;
};

export type TrayToggleItem = {
  readonly label: string;
  readonly enabled: boolean;
};

export type TrayStationsMenu = {
  readonly label: string;
  readonly items: readonly TrayStationEntry[];
};

export type TrayLabelItem = {
  readonly label: string;
};

export type TrayCheckItem = {
  readonly label: string;
  readonly checked: boolean;
};

export type TrayMenuModel = {
  readonly toggle: TrayToggleItem;
  readonly stations: TrayStationsMenu;
  readonly closeToTray: TrayCheckItem;
  readonly toggleWindow: TrayLabelItem;
  readonly quit: TrayLabelItem;
};

export type BuildTrayMenuInput = {
  readonly status: PlayerStatus;
  readonly labels: TrayLabels;
  readonly stations: readonly TrayStation[];
  readonly activeStationId: string;
  readonly closeToTray: boolean;
};

export function buildTrayMenuModel({
  status,
  labels,
  stations,
  activeStationId,
  closeToTray,
}: BuildTrayMenuInput): TrayMenuModel {
  const playing = status === "playing";

  return {
    toggle: {
      label: playing ? labels.pause : labels.play,
      enabled: status !== "loading",
    },
    stations: {
      label: labels.stations,
      items: stations.map((station) => ({
        id: station.id,
        name: station.name,
        active: station.id === activeStationId,
      })),
    },
    closeToTray: { label: labels.closeToTray, checked: closeToTray },
    toggleWindow: { label: labels.toggleWindow },
    quit: { label: labels.quit },
  };
}
