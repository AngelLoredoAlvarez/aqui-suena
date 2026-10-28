// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  loadPersistedPlayerCardPosition,
  loadPersistedPlayerCardPositionAsync,
  PLAYER_CARD_POSITION_STORAGE_KEY,
  type PlayerCardPositionStore,
  savePersistedPlayerCardPosition,
  savePersistedPlayerCardPositionAsync,
} from "./player-card-position";

function makeStore(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };

  return {
    data,
    getItem: (key: string) => (key in data ? (data[key] ?? null) : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

function makeAsyncStore(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };

  return {
    data,
    getItem: async (key: string) => (key in data ? (data[key] ?? null) : null),
    setItem: async (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe("loadPersistedPlayerCardPosition", () => {
  it("returns undefined when no store is given", () => {
    expect(loadPersistedPlayerCardPosition()).toBeUndefined();
  });

  it("returns undefined when the store is empty", () => {
    expect(loadPersistedPlayerCardPosition(makeStore())).toBeUndefined();
  });

  it("returns the stored position when it is valid", () => {
    const store = makeStore({ [PLAYER_CARD_POSITION_STORAGE_KEY]: "top" });

    expect(loadPersistedPlayerCardPosition(store)).toBe("top");
  });

  it("returns undefined for an invalid stored value", () => {
    const store = makeStore({ [PLAYER_CARD_POSITION_STORAGE_KEY]: "sideways" });

    expect(loadPersistedPlayerCardPosition(store)).toBeUndefined();
  });

  it("does not throw when getItem throws", () => {
    const store: PlayerCardPositionStore = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {},
    };

    expect(() => loadPersistedPlayerCardPosition(store)).not.toThrow();
    expect(loadPersistedPlayerCardPosition(store)).toBeUndefined();
  });
});

describe("savePersistedPlayerCardPosition", () => {
  it("writes the position to the store", () => {
    const store = makeStore();

    savePersistedPlayerCardPosition(store, "top");

    expect(store.data[PLAYER_CARD_POSITION_STORAGE_KEY]).toBe("top");
  });

  it("does not throw when the store is undefined", () => {
    expect(() => savePersistedPlayerCardPosition(undefined, "bottom")).not.toThrow();
  });

  it("does not throw when setItem throws", () => {
    const store: PlayerCardPositionStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("denied");
      },
    };

    expect(() => savePersistedPlayerCardPosition(store, "top")).not.toThrow();
  });
});

describe("async variants", () => {
  it("loads the persisted position asynchronously", async () => {
    const store = makeAsyncStore({ [PLAYER_CARD_POSITION_STORAGE_KEY]: "bottom" });

    await expect(loadPersistedPlayerCardPositionAsync(store)).resolves.toBe("bottom");
  });

  it("saves the position asynchronously", async () => {
    const store = makeAsyncStore();

    await savePersistedPlayerCardPositionAsync(store, "top");

    expect(store.data[PLAYER_CARD_POSITION_STORAGE_KEY]).toBe("top");
  });
});
