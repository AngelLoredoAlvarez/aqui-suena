import { PlayerLanding } from "@aqui-suena/ui";
import type { PlayerCardPosition } from "@aqui-suena/ui/state";
import {
  loadPersistedPlayerCardPositionAsync,
  savePersistedPlayerCardPositionAsync,
} from "@aqui-suena/ui/state";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const deviceStore = AsyncStorage;

export default function Index() {
  const [initialPosition, setInitialPosition] = useState<PlayerCardPosition | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const persisted = await loadPersistedPlayerCardPositionAsync(deviceStore);
        if (active && persisted) {
          setInitialPosition(persisted);
        }
      } catch {
        // Keep the default: storage errors must never break boot.
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, []);

  const handlePositionChange = useCallback((next: PlayerCardPosition) => {
    void savePersistedPlayerCardPositionAsync(deviceStore, next);
  }, []);

  return (
    <PlayerLanding onPositionChange={handlePositionChange} initialPosition={initialPosition} />
  );
}
