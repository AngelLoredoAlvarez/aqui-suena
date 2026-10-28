import { PlayerLanding } from "@aqui-suena/ui";
import type { PlayerCardPosition } from "@aqui-suena/ui/state";
import {
  loadPersistedPlayerCardPositionAsync,
  savePersistedPlayerCardPositionAsync,
  useSetPlayerCardPosition,
} from "@aqui-suena/ui/state";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect } from "react";

const deviceStore = AsyncStorage;

export default function Index() {
  const setPosition = useSetPlayerCardPosition();

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const persisted = await loadPersistedPlayerCardPositionAsync(deviceStore);
        if (active && persisted) {
          setPosition(persisted);
        }
      } catch {
        // Keep the default: storage errors must never break boot.
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, [setPosition]);

  const handlePositionChange = useCallback((next: PlayerCardPosition) => {
    void savePersistedPlayerCardPositionAsync(deviceStore, next);
  }, []);

  return <PlayerLanding onPositionChange={handlePositionChange} />;
}
