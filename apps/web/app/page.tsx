"use client";

import { PlayerLanding } from "@aqui-suena/ui";
import type { PlayerCardPosition, ThemePreference } from "@aqui-suena/ui/state";
import {
  loadPersistedPlayerCardPosition,
  loadPersistedTheme,
  savePersistedPlayerCardPosition,
  savePersistedTheme,
} from "@aqui-suena/ui/state";
import { trayBridge } from "@aqui-suena/web/app/tray-bridge";
import { useCallback, useEffect, useState } from "react";

export default function HomePage() {
  const [initialPosition, setInitialPosition] = useState<PlayerCardPosition | undefined>(undefined);
  const [initialScheme, setInitialScheme] = useState<ThemePreference | undefined>(undefined);

  useEffect(() => {
    const persistedPosition = loadPersistedPlayerCardPosition(window.localStorage);

    if (persistedPosition) {
      setInitialPosition(persistedPosition);
    }

    const persistedTheme = loadPersistedTheme(window.localStorage);

    if (persistedTheme) {
      setInitialScheme(persistedTheme);
    }
  }, []);

  const handlePositionChange = useCallback((next: PlayerCardPosition) => {
    savePersistedPlayerCardPosition(window.localStorage, next);
  }, []);

  const handleSchemeChange = useCallback((next: ThemePreference) => {
    savePersistedTheme(window.localStorage, next);
  }, []);

  return (
    <PlayerLanding
      scheme={initialScheme ?? "noche"}
      trayBridge={trayBridge}
      onPositionChange={handlePositionChange}
      onSchemeChange={handleSchemeChange}
      initialPosition={initialPosition}
    />
  );
}
