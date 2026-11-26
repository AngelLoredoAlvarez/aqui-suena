import { PaymentService } from "@aqui-suena/api/domain/billing/payments/payment-service";
import { RefreshPendingPayments } from "@aqui-suena/api/domain/billing/payments/refresh-pending-payments";
import { RenewSubscriptions } from "@aqui-suena/api/domain/billing/payments/renew-subscriptions";
import { DowngradeExpiredGrace } from "@aqui-suena/api/domain/billing/subscriptions/downgrade-grace";
import { FailRenewal } from "@aqui-suena/api/domain/billing/subscriptions/fail-renewal";
import { RenewSubscription } from "@aqui-suena/api/domain/billing/subscriptions/renew";
import { SubscribeToPlan } from "@aqui-suena/api/domain/billing/subscriptions/subscribe";
import { SubscriptionPaymentWriter } from "@aqui-suena/api/domain/billing/subscriptions/subscription-payment-writer";
import { ConektaPaymentProvider } from "@aqui-suena/api/infrastructure/billing/conekta/conekta-payment-provider";
import { D1PaymentRepository } from "@aqui-suena/api/infrastructure/billing/payments/d1-payment-repository";
import { D1PlanRepository } from "@aqui-suena/api/infrastructure/plans/d1-plan-repository";
import {
  createPaymentNotifier,
  createSubscriptionNotifier,
} from "@aqui-suena/api/server/composition/email";
import { createD1Repositories } from "@aqui-suena/api/server/composition/repositories";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";

export async function runPaymentSweeps(env: WorkerEnv): Promise<void> {
  if (env.CONEKTA_PRIVATE_KEY === undefined) {
    console.error("worker: payment sweeps skipped, Conekta is unconfigured");

    return;
  }

  const repositories = createD1Repositories(env.aqui_suena_db);

  const plans = new D1PlanRepository(env.aqui_suena_db);

  const provider = new ConektaPaymentProvider({
    apiKey: env.CONEKTA_PRIVATE_KEY,
    baseUrl: env.CONEKTA_BASE_URL,
  });

  const emailSettings = {
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM,
    appUrl: env.EMAIL_APP_URL,
    supportEmail: env.EMAIL_SUPPORT_ADDRESS,
  };

  const subscriptionNotifier = createSubscriptionNotifier(emailSettings);

  const paymentNotifier = createPaymentNotifier(emailSettings);

  const subscribe = new SubscribeToPlan({ subscriptions: repositories.subscription });

  const renewSubscription = new RenewSubscription({ subscriptions: repositories.subscription });

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

  const subscriptionWriter = new SubscriptionPaymentWriter({
    subscriptions: repositories.subscription,
    subscribe,
    renew: renewSubscription,
  });

  const payments = new D1PaymentRepository(env.aqui_suena_db);

  const paymentService = new PaymentService({
    payments,
    plans,
    provider,
    subscriptions: subscriptionWriter,
    accounts: repositories.account,
    notifier: paymentNotifier,
    onDeliveryError: (error, stage, paymentId) =>
      console.error(
        `worker: ${stage} email for payment ${paymentId} failed: ${error instanceof Error ? error.message : "unknown error"}`,
      ),
  });

  const refresh = new RefreshPendingPayments({
    payments,
    provider,
    service: paymentService,
    limit: 5,
    onError: (message, paymentId) =>
      console.error(`worker: refresh of payment ${paymentId} failed: ${message}`),
  });

  const renew = new RenewSubscriptions({
    subscriptions: repositories.subscription,
    payments,
    paymentService,
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
