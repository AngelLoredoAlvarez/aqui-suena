import { ProcessRenewalReminders } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/process-renewal-reminders";
import { RenewalReminderService } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/renewal-reminder-service";
import { D1ReminderLogRepository } from "@aqui-suena/api/infrastructure/billing/subscriptions/d1-reminder-log-repository";
import { createSubscriptionNotifier } from "@aqui-suena/api/server/composition/email";
import { createD1Repositories } from "@aqui-suena/api/server/composition/repositories";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";

export async function runRenewalReminders(env: WorkerEnv): Promise<void> {
  const repositories = createD1Repositories(env.aqui_suena_db);
  const notifier = createSubscriptionNotifier({
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM,
    appUrl: env.EMAIL_APP_URL,
    supportEmail: env.EMAIL_SUPPORT_ADDRESS,
  });

  if (notifier === undefined) {
    console.error("worker: renewal reminders skipped, email is unconfigured");

    return;
  }

  const reminders = new RenewalReminderService({
    subscriptionRepo: repositories.subscription,
    reminderLog: new D1ReminderLogRepository(env.aqui_suena_db),
    notifier,
  });

  const sweep = new ProcessRenewalReminders({
    subscriptions: repositories.subscription,
    accounts: repositories.account,
    reminders,
    limit: 5,
    onError: (message, subscriptionId) =>
      console.error(`worker: renewal reminder for ${subscriptionId} failed: ${message}`),
  });

  await sweep.execute();
}
