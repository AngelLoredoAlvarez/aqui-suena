"use client";

import { PlayerLanding } from "@aqui-suena/ui";
import type { PlayerCardPosition } from "@aqui-suena/ui/state";
import {
  loadPersistedPlayerCardPosition,
  savePersistedPlayerCardPosition,
} from "@aqui-suena/ui/state";
import { useCallback, useEffect, useState } from "react";
import { trayBridge } from "./tray-bridge";

export default function HomePage() {
  const [initialPosition, setInitialPosition] = useState<PlayerCardPosition | undefined>(undefined);

  useEffect(() => {
    const persisted = loadPersistedPlayerCardPosition(window.localStorage);
    if (persisted) {
      setInitialPosition(persisted);
    }
  }, []);

  const handlePositionChange = useCallback((next: PlayerCardPosition) => {
    savePersistedPlayerCardPosition(window.localStorage, next);
  }, []);

  return (
    <PlayerLanding
      trayBridge={trayBridge}
      onPositionChange={handlePositionChange}
      initialPosition={initialPosition}
    />
  );
}
