"use client";

import { PlayerLanding } from "@aqui-suena/ui";
import type { PlayerCardPosition } from "@aqui-suena/ui/state";
import {
  loadPersistedPlayerCardPosition,
  savePersistedPlayerCardPosition,
  useSetPlayerCardPosition,
} from "@aqui-suena/ui/state";
import { useCallback, useEffect } from "react";
import { trayBridge } from "./tray-bridge";

export default function HomePage() {
  const setPosition = useSetPlayerCardPosition();

  useEffect(() => {
    const persisted = loadPersistedPlayerCardPosition(window.localStorage);
    if (persisted) {
      setPosition(persisted);
    }
  }, [setPosition]);

  const handlePositionChange = useCallback((next: PlayerCardPosition) => {
    savePersistedPlayerCardPosition(window.localStorage, next);
  }, []);

  return <PlayerLanding trayBridge={trayBridge} onPositionChange={handlePositionChange} />;
}
