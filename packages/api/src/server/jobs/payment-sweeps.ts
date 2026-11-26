import { CompletePayment } from "@aqui-suena/api/domain/billing/payments/use-cases/complete-payment";
import { CreatePayment } from "@aqui-suena/api/domain/billing/payments/use-cases/create-payment";
import { ExpirePayment } from "@aqui-suena/api/domain/billing/payments/use-cases/expire-payment";
import { FailPayment } from "@aqui-suena/api/domain/billing/payments/use-cases/fail-payment";
import { PaymentNotifications } from "@aqui-suena/api/domain/billing/payments/use-cases/payment-notifications";
import { RefreshPendingPayments } from "@aqui-suena/api/domain/billing/payments/use-cases/refresh-pending-payments";
import { RenewSubscriptions } from "@aqui-suena/api/domain/billing/payments/use-cases/renew-subscriptions";
import { SubscriptionPaymentWriter } from "@aqui-suena/api/domain/billing/subscriptions/ports/subscription-payment-writer";
import { DowngradeExpiredGrace } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/downgrade-grace";
import { FailRenewal } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/fail-renewal";
import { RenewSubscription } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/renew";
import { SubscribeToPlan } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/subscribe";
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

  const notifications = new PaymentNotifications({
    payments,
    plans,
    accounts: repositories.account,
    notifier: paymentNotifier,
    onDeliveryError: (error, stage, paymentId) =>
      console.error(
        `worker: ${stage} email for payment ${paymentId} failed: ${error instanceof Error ? error.message : "unknown error"}`,
      ),
  });

  const completePayment = new CompletePayment({
    payments,
    subscriptions: subscriptionWriter,
    notifications,
  });

  const failPayment = new FailPayment({ payments });
  const expirePayment = new ExpirePayment({ payments });

  const createPayment = new CreatePayment({
    payments,
    plans,
    provider,
    complete: completePayment,
    notifications,
  });

  const refresh = new RefreshPendingPayments({
    payments,
    provider,
    service: { complete: completePayment, fail: failPayment, expire: expirePayment },
    limit: 5,
    onError: (message, paymentId) =>
      console.error(`worker: refresh of payment ${paymentId} failed: ${message}`),
  });

  const renew = new RenewSubscriptions({
    subscriptions: repositories.subscription,
    payments,
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
