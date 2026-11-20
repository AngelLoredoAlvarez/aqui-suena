import type { DeleteAccount } from "@aqui-suena/api/domain/accounts/delete-account";
import type { CancelInvoice } from "@aqui-suena/api/domain/billing/invoices/cancel-invoice";
import type {
  CfdiDocumentLinker,
  CfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import type { IssueInvoice } from "@aqui-suena/api/domain/billing/invoices/issue-invoice";
import type { ReconcileCancellations } from "@aqui-suena/api/domain/billing/invoices/reconcile-cancellations";
import type { CheckoutService } from "@aqui-suena/api/domain/billing/payments/checkout-service";
import type { PaymentRepository } from "@aqui-suena/api/domain/billing/payments/payment";
import type { SubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/subscription-notifier";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import type { StationRepository } from "@aqui-suena/api/domain/radio/station";
import type { PlanCatalogRetriever } from "@aqui-suena/api/domain/support/plan-catalog";
import type { DirectoryRepositories } from "@aqui-suena/api/server/composition/repositories";
import { createAccountRouter } from "@aqui-suena/api/server/routers/account/account";
import { createCarouselRouter } from "@aqui-suena/api/server/routers/ads/carousel";
import { createBillingRouter } from "@aqui-suena/api/server/routers/billing/billing";
import { createBusinessesRouter } from "@aqui-suena/api/server/routers/directory/businesses";
import { createFlyersRouter } from "@aqui-suena/api/server/routers/directory/flyers";
import { createHoursRouter } from "@aqui-suena/api/server/routers/directory/hours";
import { createPhotosRouter } from "@aqui-suena/api/server/routers/directory/photos";
import { createProductsRouter } from "@aqui-suena/api/server/routers/directory/products";
import { createServicesRouter } from "@aqui-suena/api/server/routers/directory/services";
import { createWorkEntriesRouter } from "@aqui-suena/api/server/routers/directory/work-entries";
import { createMediaRouter } from "@aqui-suena/api/server/routers/media/media";
import { createPlansRouter } from "@aqui-suena/api/server/routers/plans/plans";
import { createListenerRouter } from "@aqui-suena/api/server/routers/radio/listener";
import { createSubscriptionsRouter } from "@aqui-suena/api/server/routers/subscriptions/subscriptions";
import { type AiBinding, createSupportRouter } from "@aqui-suena/api/server/routers/support";
import { router } from "@aqui-suena/api/server/trpc/trpc";

export type BillingSurfaces = {
  readonly checkout?: Pick<CheckoutService, "execute">;
  readonly payments?: PaymentRepository;
  readonly issueInvoice?: Pick<IssueInvoice, "execute">;
  readonly invoices?: CfdiInvoiceRepository;
  readonly documents?: CfdiDocumentLinker;
  readonly cancelInvoice?: Pick<CancelInvoice, "execute">;
  readonly reconcile?: Pick<ReconcileCancellations, "execute">;
};

export function createAppRouter(
  planRepository: PlanRepository,
  directoryRepositories: DirectoryRepositories,
  stationRepository: StationRepository,
  ai: AiBinding | undefined,
  planCatalogRetriever: PlanCatalogRetriever | undefined,
  aiGatewayId: string | undefined,
  mediaStorage: ObjectStorage | undefined,
  subscriptionNotifier?: SubscriptionNotifier,
  billing?: BillingSurfaces,
  deleteAccount?: Pick<DeleteAccount, "execute">,
) {
  return router({
    ads: createCarouselRouter({
      businessRepository: directoryRepositories.business,
      flyerRepository: directoryRepositories.flyer,
      hourRepository: directoryRepositories.hour,
      subscriptionRepository: directoryRepositories.subscription,
    }),
    billing: createBillingRouter({
      account: directoryRepositories.account,
      ...(billing ?? {}),
    }),
    businesses: createBusinessesRouter({
      business: directoryRepositories.business,
      subscription: directoryRepositories.subscription,
    }),
    flyers: createFlyersRouter({
      flyer: directoryRepositories.flyer,
      business: directoryRepositories.business,
    }),
    hours: createHoursRouter({
      hour: directoryRepositories.hour,
      business: directoryRepositories.business,
    }),
    listener: createListenerRouter(stationRepository),
    media: createMediaRouter({
      media: directoryRepositories.media,
      business: directoryRepositories.business,
      subscription: directoryRepositories.subscription,
      storage: mediaStorage,
    }),
    photos: createPhotosRouter({
      photo: directoryRepositories.photo,
      business: directoryRepositories.business,
    }),
    products: createProductsRouter({
      product: directoryRepositories.product,
      business: directoryRepositories.business,
      subscription: directoryRepositories.subscription,
    }),
    services: createServicesRouter({
      service: directoryRepositories.service,
      business: directoryRepositories.business,
    }),
    subscriptions: createSubscriptionsRouter({
      subscription: directoryRepositories.subscription,
      plan: planRepository,
      account: directoryRepositories.account,
      notifier: subscriptionNotifier,
    }),
    workEntries: createWorkEntriesRouter({
      workEntry: directoryRepositories.workEntry,
      business: directoryRepositories.business,
    }),
    plans: createPlansRouter(planRepository),
    account: createAccountRouter({ account: directoryRepositories.account, deleteAccount }),
    support: createSupportRouter(planRepository, ai, planCatalogRetriever, aiGatewayId),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
