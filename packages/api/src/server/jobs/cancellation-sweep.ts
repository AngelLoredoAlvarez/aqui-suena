import { facturamaEnv, r2Env } from "@aqui-suena/api/server/composition/env-mappers";
import { createCancelInvoice } from "@aqui-suena/api/server/composition/invoices";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";

export async function runCancellationSweep(env: WorkerEnv): Promise<void> {
  const cancellation = createCancelInvoice({
    db: env.aqui_suena_db,
    facturama: facturamaEnv(env),
    r2: r2Env(env),
  });

  if (cancellation === undefined) {
    console.error("worker: cancellation sweep skipped, invoicing is unconfigured");

    return;
  }

  // Success stays quiet: the sweep reports failures through the reconcile hook,
  // and the lint config only allows console.error.
  await cancellation.reconcile.executeAll();
}
