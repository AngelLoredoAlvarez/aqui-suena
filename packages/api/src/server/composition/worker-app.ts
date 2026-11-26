import { CheckoutService } from "@aqui-suena/api/domain/billing/payments/checkout-service";
import { PaymentService } from "@aqui-suena/api/domain/billing/payments/payment-service";
import { RenewSubscription } from "@aqui-suena/api/domain/billing/subscriptions/renew";
import { SubscribeToPlan } from "@aqui-suena/api/domain/billing/subscriptions/subscribe";
import { SubscriptionPaymentWriter } from "@aqui-suena/api/domain/billing/subscriptions/subscription-payment-writer";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import {
  FullCatalogRetriever,
  VectorPlanCatalogRetriever,
} from "@aqui-suena/api/domain/support/plan-catalog";
import { ConektaPaymentProvider } from "@aqui-suena/api/infrastructure/billing/conekta/conekta-payment-provider";
import { D1PaymentEventRepository } from "@aqui-suena/api/infrastructure/billing/payments/d1-payment-event-repository";
import { D1PaymentRepository } from "@aqui-suena/api/infrastructure/billing/payments/d1-payment-repository";
import type { R2ObjectStorage } from "@aqui-suena/api/infrastructure/media/r2-object-storage";
import { D1PlanRepository } from "@aqui-suena/api/infrastructure/plans/d1-plan-repository";
import { D1StationRepository } from "@aqui-suena/api/infrastructure/radio/d1-station-repository";
import { VectorizePlanVectorIndex } from "@aqui-suena/api/infrastructure/support/vectorize-plan-index";
import { WorkersAiEmbeddingModel } from "@aqui-suena/api/infrastructure/support/workers-ai-embedding-model";
import {
  createCfdiNotifier,
  createPaymentNotifier,
  createSubscriptionNotifier,
  emailBillingUrl,
} from "@aqui-suena/api/server/composition/email";
import {
  facturamaEnv,
  mediaStorageFromEnv,
  r2Env,
} from "@aqui-suena/api/server/composition/env-mappers";
import {
  createCancelInvoice,
  createInvoiceHistory,
  createIssueInvoice,
} from "@aqui-suena/api/server/composition/invoices";
import {
  createD1Repositories,
  type DirectoryRepositories,
} from "@aqui-suena/api/server/composition/repositories";
import { parseAllowedOrigins } from "@aqui-suena/api/server/env";
import { createApp } from "@aqui-suena/api/server/http/app";
import { createConektaWebhookHandler } from "@aqui-suena/api/server/http/conekta-webhook";
import type { AiBinding } from "@aqui-suena/api/server/routers/support";
import type { WorkerEnv } from "@aqui-suena/api/server/worker-env";

/** Embedding model for plan vectors; 1024 dimensions, multilingual (es/en). */
const EMBEDDING_MODEL = "@cf/baai/bge-m3";

/** How many plans to inject into the support prompt via vector search. */
const RETRIEVAL_TOP_K = 2;

export interface WorkerCore {
  readonly ai: AiBinding;
  readonly gatewayId: string | undefined;
  readonly embeddingModel: WorkersAiEmbeddingModel | undefined;
  readonly vectorIndex: VectorizePlanVectorIndex | undefined;
  readonly planRepository: PlanRepository;
  readonly directoryRepositories: DirectoryRepositories;
  readonly mediaStorage: R2ObjectStorage | undefined;
}

/**
 * The dependencies every request path needs before routing: the AI/vector
 * plumbing, the plan and directory repositories, and media storage. Kept
 * separate from the full app so admin endpoints can short-circuit without
 * composing billing/email/invoices for a request that never reaches them.
 */
export function createWorkerCore(env: WorkerEnv): WorkerCore {
  const ai = env.AI as unknown as AiBinding;
  const gatewayId = env.AI_GATEWAY_ID;
  const embeddingModel =
    env.AI && env.PLAN_VECTORS
      ? new WorkersAiEmbeddingModel(env.AI as never, EMBEDDING_MODEL, gatewayId)
      : undefined;
  const vectorIndex = env.PLAN_VECTORS ? new VectorizePlanVectorIndex(env.PLAN_VECTORS) : undefined;
  const planRepository: PlanRepository = new D1PlanRepository(env.aqui_suena_db);
  const directoryRepositories = createD1Repositories(env.aqui_suena_db);
  const mediaStorage = mediaStorageFromEnv(env);

  return {
    ai,
    gatewayId,
    embeddingModel,
    vectorIndex,
    planRepository,
    directoryRepositories,
    mediaStorage,
  };
}

/**
 * Composes the full request-handling app over the shared core: notifiers,
 * invoicing, payments and the Hono router. Called only after the admin
 * endpoints have declined the request.
 */
export function createWorkerApp(env: WorkerEnv, core: WorkerCore) {
  const { ai, gatewayId, embeddingModel, vectorIndex, planRepository, directoryRepositories } =
    core;

  const retriever =
    embeddingModel && vectorIndex
      ? new VectorPlanCatalogRetriever({
          planRepository,
          embeddingModel,
          vectorIndex,
          topK: RETRIEVAL_TOP_K,
        })
      : new FullCatalogRetriever(planRepository);

  const emailSettings = {
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM,
    appUrl: env.EMAIL_APP_URL,
    supportEmail: env.EMAIL_SUPPORT_ADDRESS,
  };
  const subscriptionNotifier = createSubscriptionNotifier(emailSettings);
  const cfdiNotifier = createCfdiNotifier(emailSettings);
  const paymentNotifier = createPaymentNotifier(emailSettings);

  const issueInvoice = createIssueInvoice({
    db: env.aqui_suena_db,
    account: directoryRepositories.account,
    plans: planRepository,
    notifier: cfdiNotifier,
    downloadUrl: emailBillingUrl(env.EMAIL_APP_URL),
    facturama: facturamaEnv(env),
    r2: r2Env(env),
  });

  const cancellation = createCancelInvoice({
    db: env.aqui_suena_db,
    issueInvoice,
    facturama: facturamaEnv(env),
    r2: r2Env(env),
  });

  const invoiceHistory = createInvoiceHistory({
    db: env.aqui_suena_db,
    r2: r2Env(env),
  });

  const paymentRepository = new D1PaymentRepository(env.aqui_suena_db);
  const paymentEvents = new D1PaymentEventRepository(env.aqui_suena_db);
  const conekta = env.CONEKTA_PRIVATE_KEY
    ? new ConektaPaymentProvider({
        apiKey: env.CONEKTA_PRIVATE_KEY,
        baseUrl: env.CONEKTA_BASE_URL,
      })
    : undefined;
  const subscriptionWriter = new SubscriptionPaymentWriter({
    subscriptions: directoryRepositories.subscription,
    subscribe: new SubscribeToPlan({ subscriptions: directoryRepositories.subscription }),
    renew: new RenewSubscription({ subscriptions: directoryRepositories.subscription }),
  });
  const paymentService = conekta
    ? new PaymentService({
        payments: paymentRepository,
        plans: planRepository,
        provider: conekta,
        subscriptions: subscriptionWriter,
        accounts: directoryRepositories.account,
        notifier: paymentNotifier,
        onDeliveryError: (error, stage, paymentId) =>
          console.error(
            `worker: ${stage} email for payment ${paymentId} failed: ${error instanceof Error ? error.message : "unknown error"}`,
          ),
        cards: {
          async save(accountId, card) {
            await directoryRepositories.account.saveCard(accountId, {
              customerId: card.customerId,
              sourceId: card.sourceId,
              brand: card.card?.brand ?? null,
              last4: card.card?.last4 ?? null,
              expMonth: card.card?.expMonth ?? null,
              expYear: card.card?.expYear ?? null,
            });
          },
        },
      })
    : undefined;
  const checkout = paymentService
    ? new CheckoutService({
        payments: paymentService,
        subscriptions: directoryRepositories.subscription,
        plans: planRepository,
        accounts: directoryRepositories.account,
        returnUrl: env.EMAIL_APP_URL,
      })
    : undefined;
  const conektaWebhook =
    paymentService !== undefined && env.CONEKTA_WEBHOOK_PUBLIC_KEY
      ? createConektaWebhookHandler({
          payments: paymentRepository,
          events: paymentEvents,
          service: paymentService,
          publicKey: env.CONEKTA_WEBHOOK_PUBLIC_KEY,
          livemode: env.CONEKTA_LIVEMODE === "true",
          onError: (message) => console.error(message),
        })
      : undefined;

  if (issueInvoice === undefined) {
    console.error(
      "worker: invoicing is unconfigured (set FACTURAMA_* and R2_* to enable billing.requestInvoice)",
    );
  }

  return createApp({
    allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
    supabaseUrl: env.SUPABASE_URL,
    supabaseAnonKey: env.SUPABASE_ANON_KEY ?? env.SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: env.SUPABASE_SECRET_KEY,
    supabaseJwksUrl: env.SUPABASE_JWKS_URL,
    planRepository,
    directoryRepositories,
    ai,
    planCatalogRetriever: retriever,
    aiGatewayId: gatewayId,
    mediaStorage: core.mediaStorage,
    subscriptionNotifier,
    billing: {
      checkout,
      payments: paymentRepository,
      issueInvoice,
      invoices: invoiceHistory.invoices,
      documents: invoiceHistory.documents,
      cancelInvoice: cancellation?.cancelInvoice,
      reconcile: cancellation?.reconcile,
    },
    conektaWebhook,
    paymentCustomerDeleter: conekta,
    stationRepository: new D1StationRepository(env.aqui_suena_db),
    rateLimiter: env.RATE_LIMITER,
    logRequests: false,
  });
}
