import { CheckoutService } from "@aqui-suena/api/domain/billing/payments/checkout-service";
import { PaymentService } from "@aqui-suena/api/domain/billing/payments/payment-service";
import { RefreshPendingPayments } from "@aqui-suena/api/domain/billing/payments/refresh-pending-payments";
import { RenewSubscriptions } from "@aqui-suena/api/domain/billing/payments/renew-subscriptions";
import { ProcessRenewalReminders } from "@aqui-suena/api/domain/billing/subscriptions/process-renewal-reminders";
import { RenewalReminderService } from "@aqui-suena/api/domain/billing/subscriptions/renewal-reminder-service";
import { SubscriptionPaymentWriter } from "@aqui-suena/api/domain/billing/subscriptions/subscription-payment-writer";
import { SubscriptionService } from "@aqui-suena/api/domain/billing/subscriptions/subscription-service";
import { DEFAULT_PLAN_CATALOG, seedPlans } from "@aqui-suena/api/domain/plans/catalog";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { harnessStations } from "@aqui-suena/api/domain/radio/harness";
import {
  FullCatalogRetriever,
  seedPlanVectors,
  VectorPlanCatalogRetriever,
} from "@aqui-suena/api/domain/support/plan-catalog";
import { ConektaPaymentProvider } from "@aqui-suena/api/infrastructure/billing/conekta/conekta-payment-provider";
import { D1PaymentEventRepository } from "@aqui-suena/api/infrastructure/billing/payments/d1-payment-event-repository";
import { D1PaymentRepository } from "@aqui-suena/api/infrastructure/billing/payments/d1-payment-repository";
import { D1ReminderLogRepository } from "@aqui-suena/api/infrastructure/billing/subscriptions/d1-reminder-log-repository";
import { R2ObjectStorage } from "@aqui-suena/api/infrastructure/media/r2-object-storage";
import { D1PlanCatalogWriter } from "@aqui-suena/api/infrastructure/plans/d1-plan-catalog-writer";
import { D1PlanRepository } from "@aqui-suena/api/infrastructure/plans/d1-plan-repository";
import { D1StationCatalogWriter } from "@aqui-suena/api/infrastructure/radio/d1-station-catalog-writer";
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
  createCancelInvoice,
  createInvoiceHistory,
  createIssueInvoice,
  createRecoverMissingArchives,
  type FacturamaEnv,
  type R2Env,
} from "@aqui-suena/api/server/composition/invoices";
import { createD1Repositories } from "@aqui-suena/api/server/composition/repositories";
import { parseAllowedOrigins } from "@aqui-suena/api/server/env";
import { isAdminAuthorized } from "@aqui-suena/api/server/http/admin-auth";
import { createApp } from "@aqui-suena/api/server/http/app";
import { createConektaWebhookHandler } from "@aqui-suena/api/server/http/conekta-webhook";
import { withRequestLogging } from "@aqui-suena/api/server/http/observability";
import { isRateLimited } from "@aqui-suena/api/server/http/rate-limit";
import type { AiBinding } from "@aqui-suena/api/server/routers/support";

/** Embedding model for plan vectors; 1024 dimensions, multilingual (es/en). */
const EMBEDDING_MODEL = "@cf/baai/bge-m3";

/** How many plans to inject into the support prompt via vector search. */
const RETRIEVAL_TOP_K = 2;

export interface WorkerEnv {
  ALLOWED_ORIGINS?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_JWKS_URL?: string;
  aqui_suena_db: D1Database;
  AI: Ai;
  /** Set when the [[vectorize]] binding is enabled in wrangler.toml. */
  PLAN_VECTORS?: VectorizeIndex;
  /** Optional AI Gateway id; when set, Workers AI calls route through it. */
  AI_GATEWAY_ID?: string;
  /** Required to call POST /admin/seed-vectors. */
  ADMIN_TOKEN?: string;
  /** Cloudflare [[ratelimits]] binding; caps requests per client IP. */
  RATE_LIMITER?: RateLimit;
  /**
   * Base URL that serves the owned harness files (`/test-streams/*.m4a`).
   * Required by POST /admin/seed-stations so a dev localhost URL is never
   * written to a deployed database.
   */
  STREAM_BASE_URL?: string;
  /**
   * R2 (S3-compatible) credentials for media storage. When all three are
   * absent media is reported as unconfigured; a partial set is a configuration
   * error (logged, still unconfigured). The Worker never uses a fake.
   */
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  /** Origin every transactional-email link points at. */
  EMAIL_APP_URL?: string;
  /** Support address in the email footer; defaults to the sender. */
  EMAIL_SUPPORT_ADDRESS?: string;
  /** Facturama sandbox/production credentials and emitter fiscal settings. */
  FACTURAMA_USER?: string;
  FACTURAMA_PASSWORD?: string;
  FACTURAMA_BASE_URL?: string;
  FACTURAMA_MODE?: string;
  FACTURAMA_EXPEDITION_PLACE?: string;
  FACTURAMA_IVA_RATE?: string;
  FACTURAMA_PRODUCT_CODE?: string;
  FACTURAMA_UNIT_CODE?: string;
  FACTURAMA_SERIES?: string;
  FACTURAMA_ISSUER_RFC?: string;
  FACTURAMA_ISSUER_NAME?: string;
  FACTURAMA_ISSUER_FISCAL_REGIME?: string;
  CONEKTA_PRIVATE_KEY?: string;
  CONEKTA_PUBLIC_KEY?: string;
  CONEKTA_WEBHOOK_PUBLIC_KEY?: string;
  CONEKTA_BASE_URL?: string;
  CONEKTA_LIVEMODE?: string;
}

export default {
  fetch: withRequestLogging(handleFetch),
  scheduled: handleScheduled,
};

async function handleScheduled(_controller: ScheduledController, env: WorkerEnv): Promise<void> {
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

/**
 * The Worker env and the composition contract name the same settings
 * differently; both mappings live here so a new call site cannot drift.
 */
function facturamaEnv(env: WorkerEnv): FacturamaEnv {
  return {
    user: env.FACTURAMA_USER,
    password: env.FACTURAMA_PASSWORD,
    baseUrl: env.FACTURAMA_BASE_URL,
    mode: env.FACTURAMA_MODE === "multiemisor" ? "multiemisor" : "web",
    expeditionPlace: env.FACTURAMA_EXPEDITION_PLACE,
    ivaRate: env.FACTURAMA_IVA_RATE ? Number(env.FACTURAMA_IVA_RATE) : undefined,
    productCode: env.FACTURAMA_PRODUCT_CODE,
    unitCode: env.FACTURAMA_UNIT_CODE,
    series: env.FACTURAMA_SERIES,
    issuerRfc: env.FACTURAMA_ISSUER_RFC,
    issuerName: env.FACTURAMA_ISSUER_NAME,
    issuerFiscalRegime: env.FACTURAMA_ISSUER_FISCAL_REGIME,
  };
}

function r2Env(env: WorkerEnv): R2Env {
  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME,
    endpoint: env.R2_ENDPOINT,
  };
}

async function runCancellationSweep(env: WorkerEnv): Promise<void> {
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

async function runArchiveRecovery(env: WorkerEnv): Promise<void> {
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

async function runRenewalReminders(env: WorkerEnv): Promise<void> {
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

async function runPaymentSweeps(env: WorkerEnv): Promise<void> {
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

  const subscriptionService = new SubscriptionService({
    subscriptionRepo: repositories.subscription,
    planRepo: plans,
    businessRepo: repositories.business,
    notifier: subscriptionNotifier,
  });

  const subscriptionWriter = new SubscriptionPaymentWriter({
    subscriptions: repositories.subscription,
    service: subscriptionService,
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
    service: subscriptionService,
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

async function handleFetch(request: Request, env: WorkerEnv): Promise<Response> {
  const ai = env.AI as unknown as AiBinding;

  const gatewayId = env.AI_GATEWAY_ID;

  const embeddingModel =
    env.AI && env.PLAN_VECTORS
      ? new WorkersAiEmbeddingModel(env.AI as never, EMBEDDING_MODEL, gatewayId)
      : undefined;

  const vectorIndex = env.PLAN_VECTORS ? new VectorizePlanVectorIndex(env.PLAN_VECTORS) : undefined;

  const planRepository: PlanRepository = new D1PlanRepository(env.aqui_suena_db);

  const directoryRepositories = createD1Repositories(env.aqui_suena_db);

  const r2Credentials = {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  };

  let mediaStorage: R2ObjectStorage | undefined;
  if (r2Credentials.accountId && r2Credentials.accessKeyId && r2Credentials.secretAccessKey) {
    mediaStorage = new R2ObjectStorage({
      accountId: r2Credentials.accountId,
      accessKeyId: r2Credentials.accessKeyId,
      secretAccessKey: r2Credentials.secretAccessKey,
      bucketName: env.R2_BUCKET_NAME ?? "aqui-suena-media",
      endpoint: env.R2_ENDPOINT,
    });
  } else if (Object.values(r2Credentials).some((value) => value !== undefined && value !== "")) {
    console.error(
      "worker: incomplete R2 configuration; media storage is unconfigured (set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY)",
    );
  }

  // Admin endpoints run before the Hono app, so they apply the rate limiter here.
  if (new URL(request.url).pathname.startsWith("/admin/")) {
    if (await isRateLimited(env.RATE_LIMITER, request)) {
      return new Response("too many requests", { status: 429 });
    }
  }

  // One-off seeding endpoint for the Vectorize plan index. Returns 404
  // unless ADMIN_TOKEN is configured; requires it to match.
  if (embeddingModel && vectorIndex && new URL(request.url).pathname === "/admin/seed-vectors") {
    if (!isAdminAuthorized(request, env.ADMIN_TOKEN)) {
      return new Response("Not found", { status: 404 });
    }
    const result = await seedPlanVectors({
      planRepository,
      embeddingModel,
      vectorIndex,
    });
    return Response.json(result);
  }

  // One-off cleanup endpoint for businesses past their 90-day retention.
  // Returns 404 unless ADMIN_TOKEN is configured; requires it to match.
  if (new URL(request.url).pathname === "/admin/purge-expired-businesses") {
    if (!isAdminAuthorized(request, env.ADMIN_TOKEN)) {
      return new Response("Not found", { status: 404 });
    }
    const deleted = await directoryRepositories.business.deleteExpired(new Date());
    return Response.json({ deleted });
  }

  // Idempotent station seed for the owned harness. Refuses to run without
  // STREAM_BASE_URL so a localhost URL never reaches a deployed database.
  if (new URL(request.url).pathname === "/admin/seed-stations") {
    if (!isAdminAuthorized(request, env.ADMIN_TOKEN)) {
      return new Response("Not found", { status: 404 });
    }

    if (!env.STREAM_BASE_URL) {
      return new Response("STREAM_BASE_URL is not configured", { status: 400 });
    }

    const stations = harnessStations(env.STREAM_BASE_URL);
    const writer = new D1StationCatalogWriter(env.aqui_suena_db);

    for (const station of stations) {
      await writer.upsert(station);
    }

    return Response.json({ seeded: stations.length });
  }

  // Idempotent plan-catalog seed. Returns 404 unless ADMIN_TOKEN is
  // configured; requires it to match.
  if (new URL(request.url).pathname === "/admin/seed-plans") {
    if (!isAdminAuthorized(request, env.ADMIN_TOKEN)) {
      return new Response("Not found", { status: 404 });
    }
    const seeded = await seedPlans(
      new D1PlanCatalogWriter(env.aqui_suena_db),
      DEFAULT_PLAN_CATALOG,
    );
    return Response.json({ seeded });
  }

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
    service: new SubscriptionService({
      subscriptionRepo: directoryRepositories.subscription,
      planRepo: planRepository,
      notifier: subscriptionNotifier,
    }),
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

  const app = createApp({
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
    mediaStorage,
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

  return app.fetch(request, env);
}
