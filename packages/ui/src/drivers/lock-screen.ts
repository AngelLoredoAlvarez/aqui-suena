import type { NowPlayingMetadata } from "@aqui-suena/player";
import { isRunningInExpoGo, Platform } from "expo";
import type { useAudioPlayer } from "expo-audio";

export type NativePlayer = ReturnType<typeof useAudioPlayer>;

export const LOCK_SCREEN_OPTIONS = {
  isLiveStream: true,
  showSeekForward: false,
  showSeekBackward: false,
  showNextTrack: false,
  showPreviousTrack: false,
} as const;

export function metadataKey(metadata: NowPlayingMetadata): string {
  return `${metadata.title}\u0000${metadata.artist ?? ""}`;
}

// Expo Go ships a fixed Android manifest, so the expo-audio playback service it
// would bind here is not declared and every activation only logs a binding
// failure. Development and release builds get the service from the expo-audio
// config plugin, which keeps this check out of their way.
export function lockScreenControlsAvailable(): boolean {
  return Platform.OS !== "android" || !isRunningInExpoGo();
}

export function activateLockScreen(player: NativePlayer, metadata: NowPlayingMetadata): void {
  player.setActiveForLockScreen(
    true,
    { title: metadata.title, artist: metadata.artist },
    LOCK_SCREEN_OPTIONS,
  );
}
