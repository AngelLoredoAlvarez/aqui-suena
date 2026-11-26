import { facturamaEnv, r2Env } from "@aqui-suena/api/server/composition/env-mappers";
import { createRecoverMissingArchives } from "@aqui-suena/api/server/composition/invoices";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";

export async function runArchiveRecovery(env: WorkerEnv): Promise<void> {
  const recovery = createRecoverMissingArchives({
    db: env.aqui_suena_db,
    facturama: facturamaEnv(env),
    r2: r2Env(env),
  });

  if (recovery === undefined) {
    console.error("worker: archive recovery skipped, invoicing is unconfigured");

    return;
  }

  try {
    await recovery.execute();
  } catch (error) {
    console.error(
      `worker: fiscal archive recovery failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}
