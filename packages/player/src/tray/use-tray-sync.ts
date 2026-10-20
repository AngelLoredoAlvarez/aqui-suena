import type { PlayerStatus } from "@aqui-suena/player/status";
import { useEffect, useMemo } from "react";
import type { TrayBridge } from "./tray-bridge";
import { buildTrayMenuModel, type TrayLabels, type TrayStation } from "./tray-menu-model";

export type UseTraySyncInput = {
  readonly bridge: TrayBridge;
  readonly status: PlayerStatus;
  readonly labels: TrayLabels;
  readonly stations: readonly TrayStation[];
  readonly activeStationId: string;
  readonly onTogglePlayback: () => void;
  readonly onSelectStation: (stationId: string) => void;
};

export function useTraySync({
  bridge,
  status,
  labels,
  stations,
  activeStationId,
  onTogglePlayback,
  onSelectStation,
}: UseTraySyncInput): void {
  const model = useMemo(
    () => buildTrayMenuModel({ status, labels, stations, activeStationId }),
    [status, labels, stations, activeStationId],
  );

  useEffect(() => {
    bridge.publish(model);
  }, [bridge, model]);

  useEffect(() => {
    return bridge.onTogglePlayback(onTogglePlayback);
  }, [bridge, onTogglePlayback]);

  useEffect(() => {
    return bridge.onSelectStation(onSelectStation);
  }, [bridge, onSelectStation]);
}
