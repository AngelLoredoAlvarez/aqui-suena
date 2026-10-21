import type { PlayerStatus } from "@aqui-suena/player/status";
import { useEffect, useMemo, useRef } from "react";
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

  const lastPublished = useRef<{ bridge: TrayBridge; payload: string } | null>(null);

  useEffect(() => {
    const payload = JSON.stringify(model);
    const previous = lastPublished.current;

    if (previous !== null && previous.bridge === bridge && previous.payload === payload) {
      return;
    }

    lastPublished.current = { bridge, payload };

    void Promise.resolve(bridge.publish(model)).catch((error: unknown) => {
      console.error("tray menu publish failed; the tray menu is stale", error);
    });
  }, [bridge, model]);

  const toggleRef = useRef(onTogglePlayback);
  const selectRef = useRef(onSelectStation);

  useEffect(() => {
    toggleRef.current = onTogglePlayback;
  }, [onTogglePlayback]);

  useEffect(() => {
    selectRef.current = onSelectStation;
  }, [onSelectStation]);

  useEffect(() => {
    return bridge.onTogglePlayback(() => {
      toggleRef.current();
    });
  }, [bridge]);

  useEffect(() => {
    return bridge.onSelectStation((stationId) => {
      selectRef.current(stationId);
    });
  }, [bridge]);
}
