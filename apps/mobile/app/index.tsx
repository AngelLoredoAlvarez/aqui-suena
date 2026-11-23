import { NativeBootSplash } from "@aqui-suena/mobile/components/native-boot-splash";
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
  const [booted, setBooted] = useState(false);
  const [initialPosition, setInitialPosition] = useState<PlayerCardPosition | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBooted(true);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

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

  if (!booted) {
    return <NativeBootSplash />;
  }

  return (
    <PlayerLanding onPositionChange={handlePositionChange} initialPosition={initialPosition} />
  );
}
