import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";

export type MediaHealth = "unconfigured" | "configured" | "unreachable";

const PROBE_KEY = "health/probe";

/**
 * Presence of credentials is not access: the bucket can be missing, the key
 * revoked or the permission incomplete. This probe performs one read.
 */
export async function probeMediaStorage(storage: ObjectStorage | undefined): Promise<MediaHealth> {
  if (storage === undefined) return "unconfigured";

  try {
    await storage.head(PROBE_KEY);

    return "configured";
  } catch (error) {
    console.error("health: media probe failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return "unreachable";
  }
}
