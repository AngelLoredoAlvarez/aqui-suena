import { NativeBootSplash } from "@aqui-suena/mobile/components/native-boot-splash";
import { PlayerLanding } from "@aqui-suena/ui";
import type { PlayerCardPosition } from "@aqui-suena/ui/state";
import {
  loadPersistedPlayerCardPositionAsync,
  savePersistedPlayerCardPositionAsync,
} from "@aqui-suena/ui/state";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

const deviceStore = AsyncStorage;

export default function Index() {
  const [booted, setBooted] = useState(false);
  const [initialPosition, setInitialPosition] = useState<PlayerCardPosition | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBooted(true);
    }, 2000);

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

  return (
    <View style={styles.root}>
      <PlayerLanding onPositionChange={handlePositionChange} initialPosition={initialPosition} />
      {!booted ? (
        <View style={styles.splash}>
          <NativeBootSplash />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0F1720",
  },
  splash: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
  },
});
