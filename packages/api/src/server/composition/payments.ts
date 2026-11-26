import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type { PaymentNotifier } from "@aqui-suena/api/domain/billing/payments/ports/payment-notifier";
import type { PaymentCardWriter } from "@aqui-suena/api/domain/billing/payments/ports/payment-provider";
import { CompletePayment } from "@aqui-suena/api/domain/billing/payments/use-cases/complete-payment";
import { CreatePayment } from "@aqui-suena/api/domain/billing/payments/use-cases/create-payment";
import { ExpirePayment } from "@aqui-suena/api/domain/billing/payments/use-cases/expire-payment";
import { FailPayment } from "@aqui-suena/api/domain/billing/payments/use-cases/fail-payment";
import { PaymentNotifications } from "@aqui-suena/api/domain/billing/payments/use-cases/payment-notifications";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/model/subscription";
import { SubscriptionPaymentWriter } from "@aqui-suena/api/domain/billing/subscriptions/ports/subscription-payment-writer";
import { RenewSubscription } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/renew";
import { SubscribeToPlan } from "@aqui-suena/api/domain/billing/subscriptions/use-cases/subscribe";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { ConektaPaymentProvider } from "@aqui-suena/api/infrastructure/billing/conekta/conekta-payment-provider";
import { D1PaymentRepository } from "@aqui-suena/api/infrastructure/billing/payments/d1-payment-repository";

export interface PaymentGraph {
  readonly payments: D1PaymentRepository;
  readonly conekta: ConektaPaymentProvider | undefined;
  readonly subscriptionWriter: SubscriptionPaymentWriter;
  readonly notifications: PaymentNotifications;
  readonly completePayment: CompletePayment;
  readonly failPayment: FailPayment;
  readonly expirePayment: ExpirePayment;
  readonly createPayment: CreatePayment | undefined;
}

export interface PaymentGraphDeps {
  readonly db: D1Database;
  readonly plans: PlanRepository;
  readonly subscriptions: SubscriptionRepository;
  readonly accounts: Pick<AccountRepository, "getById">;
  readonly notifier: PaymentNotifier | undefined;
  readonly conekta?: { readonly apiKey: string; readonly baseUrl?: string };
  readonly cards?: PaymentCardWriter;
  readonly onDeliveryError: (
    error: unknown,
    stage: "receipt" | "pending",
    paymentId: string,
  ) => void;
}

/**
 * Composes the payment use-case graph shared by the request path and the
 * scheduled payment sweeps: the repository, the provider, the subscription
 * writer and the complete/fail/expire/create chain. Callers compose the
 * extra pieces they need (checkout, webhook, renewal sweeps) on top.
 */
export function createPaymentGraph(deps: PaymentGraphDeps): PaymentGraph {
  const payments = new D1PaymentRepository(deps.db);

  const conekta = deps.conekta
    ? new ConektaPaymentProvider({ apiKey: deps.conekta.apiKey, baseUrl: deps.conekta.baseUrl })
    : undefined;

  const subscriptionWriter = new SubscriptionPaymentWriter({
    subscriptions: deps.subscriptions,
    subscribe: new SubscribeToPlan({ subscriptions: deps.subscriptions }),
    renew: new RenewSubscription({ subscriptions: deps.subscriptions }),
  });

  const notifications = new PaymentNotifications({
    payments,
    plans: deps.plans,
    accounts: deps.accounts,
    notifier: deps.notifier,
    onDeliveryError: deps.onDeliveryError,
  });

  const completePayment = new CompletePayment({
    payments,
    subscriptions: subscriptionWriter,
    notifications,
  });

  const failPayment = new FailPayment({ payments });
  const expirePayment = new ExpirePayment({ payments });

  const createPayment = conekta
    ? new CreatePayment({
        payments,
        plans: deps.plans,
        provider: conekta,
        cards: deps.cards,
        complete: completePayment,
        notifications,
      })
    : undefined;

  return {
    payments,
    conekta,
    subscriptionWriter,
    notifications,
    completePayment,
    failPayment,
    expirePayment,
    createPayment,
  };
}
