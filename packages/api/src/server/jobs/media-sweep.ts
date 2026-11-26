import { PurgeExpiredBusinesses } from "@aqui-suena/api/domain/directory/use-cases/purge-expired-businesses";
import { SweepMediaOrphans } from "@aqui-suena/api/domain/media/sweep-orphans";
import { mediaStorageFromEnv } from "@aqui-suena/api/server/composition/env-mappers";
import { createD1Repositories } from "@aqui-suena/api/server/composition/repositories";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";

export const MEDIA_SWEEP_CRON = "0 3 * * *";

export async function runMediaMaintenance(env: WorkerEnv): Promise<void> {
  const storage = mediaStorageFromEnv(env);

  if (storage === undefined) {
    console.error("worker: media maintenance skipped, media storage is unconfigured");

    return;
  }

  const repositories = createD1Repositories(env.aqui_suena_db);

  try {
    await new PurgeExpiredBusinesses({
      businesses: repositories.business,
      media: repositories.media,
      storage,
    }).execute();
  } catch (error) {
    console.error(
      `worker: expired business purge failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  try {
    await new SweepMediaOrphans({ media: repositories.media, storage }).execute();
  } catch (error) {
    console.error(
      `worker: media orphan sweep failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}
