import type { ListenSessionRepository } from "@aqui-suena/api/domain/radio/listen-session";

// A session counts as active while its last heartbeat is inside this window.
export const ACTIVE_LISTENER_WINDOW_MS = 60_000;

const TARGET_BUCKET_MS = 30_000;
const MIN_FAKE_LISTENERS = 3;
const MAX_FAKE_LISTENERS = 80;

function hash(value: string): number {
  let result = 2_166_136_261;

  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16_777_619);
  }

  return result >>> 0;
}

export function fakeListenerTarget(stationId: string, now: Date): number {
  const bucket = Math.floor(now.getTime() / TARGET_BUCKET_MS);
  const span = MAX_FAKE_LISTENERS - MIN_FAKE_LISTENERS + 1;

  return MIN_FAKE_LISTENERS + (hash(`${stationId}:${bucket}`) % span);
}

/**
 * Simulates the real heartbeat path: it writes one active session row per
 * station and then reads the count back through the same query real sessions
 * will use. Only enabled by the FAKE_LISTENERS flag on non-production
 * environments.
 */
export async function refreshFakeListeners(
  sessions: ListenSessionRepository,
  stationId: string,
  now: Date,
): Promise<number> {
  await sessions.upsertActive({
    id: `fake-${stationId}`,
    stationId,
    startedAt: now,
    listeners: fakeListenerTarget(stationId, now),
  });

  return sessions.activeListeners(stationId, new Date(now.getTime() - ACTIVE_LISTENER_WINDOW_MS));
}
