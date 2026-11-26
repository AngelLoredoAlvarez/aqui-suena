import { createWorkerApp, createWorkerCore } from "@aqui-suena/api/server/composition/worker-app";
import { handleAdminRequest } from "@aqui-suena/api/server/http/admin-routes";
import { withRequestLogging } from "@aqui-suena/api/server/http/observability";
import { runArchiveRecovery } from "@aqui-suena/api/server/jobs/archive-recovery";
import { runCancellationSweep } from "@aqui-suena/api/server/jobs/cancellation-sweep";
import { MEDIA_SWEEP_CRON, runMediaMaintenance } from "@aqui-suena/api/server/jobs/media-sweep";
import { runPaymentSweeps } from "@aqui-suena/api/server/jobs/payment-sweeps";
import { runRenewalReminders } from "@aqui-suena/api/server/jobs/renewal-reminders";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";

export type { WorkerEnv } from "@aqui-suena/api/server/worker-env";

export default {
  fetch: withRequestLogging(handleFetch),
  scheduled: handleScheduled,
};

async function handleScheduled(controller: ScheduledController, env: WorkerEnv): Promise<void> {
  if (controller.cron === MEDIA_SWEEP_CRON) {
    await runMediaMaintenance(env);

    return;
  }

  try {
    await runCancellationSweep(env);
  } catch (error) {
    console.error(
      `worker: cancellation sweep failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  await runArchiveRecovery(env);

  await runPaymentSweeps(env);

  try {
    await runRenewalReminders(env);
  } catch (error) {
    console.error(
      `worker: renewal reminder sweep failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

async function handleFetch(request: Request, env: WorkerEnv): Promise<Response> {
  const core = createWorkerCore(env);

  const adminResponse = await handleAdminRequest(request, env, core);
  if (adminResponse !== undefined) {
    return adminResponse;
  }

  const app = createWorkerApp(env, core);

  return app.fetch(request, env);
}
