import { atom, useSetAtom } from "jotai";

export type PlayerCardPosition = "top" | "bottom";

export const PLAYER_CARD_POSITION_STORAGE_KEY = "aqui-suena.player-card.position";

export type PlayerCardPositionStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export type AsyncPlayerCardPositionStore = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

function isValidPosition(raw: string | null): raw is PlayerCardPosition {
  return raw === "top" || raw === "bottom";
}

export function loadPersistedPlayerCardPosition(
  store?: PlayerCardPositionStore,
): PlayerCardPosition | undefined {
  try {
    const raw = store?.getItem(PLAYER_CARD_POSITION_STORAGE_KEY) ?? null;
    return isValidPosition(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
}

export function savePersistedPlayerCardPosition(
  store: PlayerCardPositionStore | undefined,
  position: PlayerCardPosition,
): void {
  try {
    store?.setItem(PLAYER_CARD_POSITION_STORAGE_KEY, position);
  } catch {
    // Persistence is best-effort: a denied store must never break playback.
  }
}

export async function loadPersistedPlayerCardPositionAsync(
  store: AsyncPlayerCardPositionStore | undefined,
): Promise<PlayerCardPosition | undefined> {
  try {
    const stored = await store?.getItem(PLAYER_CARD_POSITION_STORAGE_KEY);
    const raw = stored ?? null;
    return isValidPosition(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
}

export async function savePersistedPlayerCardPositionAsync(
  store: AsyncPlayerCardPositionStore | undefined,
  position: PlayerCardPosition,
): Promise<void> {
  try {
    await store?.setItem(PLAYER_CARD_POSITION_STORAGE_KEY, position);
  } catch {
    // Persistence is best-effort: a denied store must never break playback.
  }
}

export const playerCardPositionAtom = atom<PlayerCardPosition>("bottom");

export function useSetPlayerCardPosition() {
  return useSetAtom(playerCardPositionAtom);
}
