const TARGET_BUCKET_MS = 30_000;
const WAVE_PERIOD_MS = 10 * 60_000;
const WAVE_AMPLITUDE = 12;
const MIN_LISTENERS = 5;
const MAX_LISTENERS = 120;
const BASELINE_MIN = 25;
const BASELINE_MAX = 70;
const JITTER_SPAN = 5;

function hash(value: string): number {
  let result = 2_166_136_261;

  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16_777_619);
  }

  return result >>> 0;
}

/**
 * Deterministic simulated count: no database writes, stable inside a 30 s
 * bucket, smooth across buckets. Used while no real listener source exists.
 */
export function simulatedListenerCount(stationId: string, now: Date): number {
  const baseline = BASELINE_MIN + (hash(stationId) % (BASELINE_MAX - BASELINE_MIN + 1));
  const phase = ((hash(`${stationId}:phase`) % 1_000) / 1_000) * Math.PI * 2;
  const bucket = Math.floor(now.getTime() / TARGET_BUCKET_MS);
  const bucketTime = bucket * TARGET_BUCKET_MS;
  const wave = Math.sin((bucketTime / WAVE_PERIOD_MS) * Math.PI * 2 + phase) * WAVE_AMPLITUDE;
  const jitter = (hash(`${stationId}:${bucket}`) % JITTER_SPAN) - Math.floor(JITTER_SPAN / 2);
  const target = Math.round(baseline + wave + jitter);

  return Math.min(MAX_LISTENERS, Math.max(MIN_LISTENERS, target));
}
