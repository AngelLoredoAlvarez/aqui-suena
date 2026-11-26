import { RefreshPendingPayments } from "@aqui-suena/api/domain/billing/payments/use-cases/refresh-pending-payments";
import { RenewSubscriptions } from "@aqui-suena/api/domain/billing/payments/use-cases/renew-subscriptions";
import { DowngradeExpiredGrace } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/downgrade-grace";
import { FailRenewal } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/fail-renewal";
import { D1PlanRepository } from "@aqui-suena/api/infrastructure/plans/d1-plan-repository";
import {
  createPaymentNotifier,
  createSubscriptionNotifier,
} from "@aqui-suena/api/server/composition/email";
import { createPaymentGraph } from "@aqui-suena/api/server/composition/payments";
import { createD1Repositories } from "@aqui-suena/api/server/composition/repositories";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";

export async function runPaymentSweeps(env: WorkerEnv): Promise<void> {
  if (env.CONEKTA_PRIVATE_KEY === undefined) {
    console.error("worker: payment sweeps skipped, Conekta is unconfigured");

    return;
  }

  const repositories = createD1Repositories(env.aqui_suena_db);

  const plans = new D1PlanRepository(env.aqui_suena_db);

  const emailSettings = {
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM,
    appUrl: env.EMAIL_APP_URL,
    supportEmail: env.EMAIL_SUPPORT_ADDRESS,
  };

  const graph = createPaymentGraph({
    db: env.aqui_suena_db,
    plans,
    subscriptions: repositories.subscription,
    accounts: repositories.account,
    notifier: createPaymentNotifier(emailSettings),
    conekta: { apiKey: env.CONEKTA_PRIVATE_KEY, baseUrl: env.CONEKTA_BASE_URL },
    onDeliveryError: (error, stage, paymentId) =>
      console.error(
        `worker: ${stage} email for payment ${paymentId} failed: ${error instanceof Error ? error.message : "unknown error"}`,
      ),
  });

  const { conekta, createPayment } = graph;

  if (conekta === undefined || createPayment === undefined) {
    // Unreachable: CONEKTA_PRIVATE_KEY is checked above, so the factory always
    // builds the provider and its create-payment chain here.
    console.error("worker: payment sweeps skipped, Conekta is unconfigured");

    return;
  }

  const subscriptionNotifier = createSubscriptionNotifier(emailSettings);

  const failRenewal = new FailRenewal({
    subscriptions: repositories.subscription,
    notifier: subscriptionNotifier,
  });

  const downgradeExpiredGrace = new DowngradeExpiredGrace({
    subscriptions: repositories.subscription,
    plans,
    businesses: repositories.business,
    notifier: subscriptionNotifier,
  });

  const refresh = new RefreshPendingPayments({
    payments: graph.payments,
    provider: conekta,
    service: {
      complete: graph.completePayment,
      fail: graph.failPayment,
      expire: graph.expirePayment,
    },
    limit: 5,
    onError: (message, paymentId) =>
      console.error(`worker: refresh of payment ${paymentId} failed: ${message}`),
  });

  const renew = new RenewSubscriptions({
    subscriptions: repositories.subscription,
    payments: graph.payments,
    paymentService: createPayment,
    accounts: repositories.account,
    plans,
    businesses: repositories.business,
    failRenewal,
    downgradeExpiredGrace,
    limit: 5,
    onError: (message, subscriptionId) =>
      console.error(`worker: renewal of subscription ${subscriptionId} failed: ${message}`),
  });

  try {
    await refresh.execute();
  } catch (error) {
    console.error(
      `worker: pending payment refresh failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  try {
    await renew.execute();
  } catch (error) {
    console.error(
      `worker: subscription renewal failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}
