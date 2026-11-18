import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import { resolvePlan } from "@aqui-suena/api/domain/ads/ad-plan";
import type { CfdiNotifier } from "@aqui-suena/api/domain/billing/invoices/cfdi-notifier";
import type {
  CfdiDocumentStore,
  CfdiInvoice,
  CfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import {
  type InvoiceIssuer,
  InvoiceProviderRejection,
} from "@aqui-suena/api/domain/billing/invoices/invoice-issuer";
import type { SubscriptionRepository } from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { UPGRADE_HINTS } from "@aqui-suena/api/domain/plans/entitlements";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import {
  DataIntegrityError,
  UpgradeRequired,
  ValidationError,
} from "@aqui-suena/api/shared/domain-error";

export type IssueInvoiceDependencies = {
  readonly fiscalProfiles: Pick<AccountRepository, "getFiscalProfile">;
  readonly subscriptions: SubscriptionRepository;
  readonly plans: Pick<PlanRepository, "getById">;
  readonly issuer: InvoiceIssuer;
  readonly invoices: CfdiInvoiceRepository;
  readonly documents: CfdiDocumentStore;
  readonly accounts?: Pick<AccountRepository, "getById">;
  readonly notifier?: CfdiNotifier;
  readonly downloadUrl?: string;
  readonly now?: () => Date;
  /** Reports a failed XML archive so the loss stays diagnosable. */
  readonly onArchiveError?: (error: unknown, accountId: string) => void;
  /** Best-effort steps that never fail the request: `pdf` download, `email` send. */
  readonly onDeliveryError?: (error: unknown, stage: "pdf" | "email", subjectId: string) => void;
};

export class IssueInvoice {
  private readonly deps: IssueInvoiceDependencies;

  constructor(deps: IssueInvoiceDependencies) {
    this.deps = deps;
  }

  async execute(accountId: string): Promise<CfdiInvoice> {
    const now = this.deps.now?.() ?? new Date();

    const subscription = await this.deps.subscriptions.getActive(accountId, now);

    const planId = resolvePlan(subscription, now);

    if (planId === "community") {
      throw new UpgradeRequired(UPGRADE_HINTS.invoiceIssue);
    }

    const fiscalProfile = await this.deps.fiscalProfiles.getFiscalProfile(accountId);

    if (fiscalProfile === null) {
      throw new ValidationError(
        "fiscalProfile: complete the fiscal data before requesting an invoice",
      );
    }

    const plan = await this.deps.plans.getById(planId);

    if (plan === null) {
      throw new DataIntegrityError("planId", planId);
    }

    try {
      const issued = await this.deps.issuer.issue({
        accountId,
        planId,
        planName: plan.name,
        amountCents: plan.priceMonthly,
        currency: plan.currency,
        fiscalProfile,
        issuedAt: now,
      });

      const xmlKey = await this.tryArchiveXml(accountId, issued.xml);
      const pdf = await this.tryDownloadPdf(issued.providerId);
      const pdfKey = pdf === null ? null : await this.tryArchivePdf(accountId, pdf);

      const invoice = await this.deps.invoices.create({
        accountId,
        paymentId: null,
        status: "issued",
        uuid: issued.uuid,
        providerId: issued.providerId,
        xmlKey,
        pdfKey,
        failureReason: null,
        cancellationMotive: null,
        cancellationRequestedAt: null,
        cancellationResolvedAt: null,
        cancellationExpiresAt: null,
        cancellationDetail: null,
        acuseKey: null,
      });

      await this.tryNotify(invoice, {
        planName: plan.name,
        amountMinorUnits: plan.priceMonthly,
        currency: plan.currency,
        xml: issued.xml,
        pdf,
      });

      return invoice;
    } catch (error) {
      if (!(error instanceof InvoiceProviderRejection)) {
        throw error;
      }

      await this.deps.invoices.create({
        accountId,
        paymentId: null,
        status: "failed",
        uuid: null,
        providerId: null,
        xmlKey: null,
        pdfKey: null,
        failureReason: error.detail,
        cancellationMotive: null,
        cancellationRequestedAt: null,
        cancellationResolvedAt: null,
        cancellationExpiresAt: null,
        cancellationDetail: null,
        acuseKey: null,
      });

      throw error;
    }
  }

  /** A stamped CFDI cannot be undone: a failed archive records `issued` with no key. */
  private async tryArchiveXml(accountId: string, xml: string): Promise<string | null> {
    try {
      return await this.deps.documents.saveXml({ accountId, xml });
    } catch (error) {
      this.deps.onArchiveError?.(error, accountId);

      return null;
    }
  }

  /** The PDF is a readable copy; losing it never invalidates the CFDI. */
  private async tryDownloadPdf(providerId: string): Promise<Uint8Array | null> {
    try {
      return await this.deps.issuer.downloadPdf(providerId);
    } catch (error) {
      this.deps.onDeliveryError?.(error, "pdf", providerId);

      return null;
    }
  }

  private async tryArchivePdf(accountId: string, pdf: Uint8Array): Promise<string | null> {
    try {
      return await this.deps.documents.savePdf({ accountId, pdf });
    } catch (error) {
      this.deps.onArchiveError?.(error, accountId);

      return null;
    }
  }

  /**
   * Delivery is best effort and never throws: the invoice is already stamped and
   * recorded, so a mail failure must not turn a fiscal fact into an HTTP error.
   */
  private async tryNotify(
    invoice: CfdiInvoice,
    data: {
      readonly planName: string;
      readonly amountMinorUnits: number;
      readonly currency: string;
      readonly xml: string;
      readonly pdf: Uint8Array | null;
    },
  ): Promise<void> {
    const { notifier, accounts, downloadUrl } = this.deps;

    if (notifier === undefined || accounts === undefined || downloadUrl === undefined) {
      return;
    }

    if (invoice.uuid === null) {
      return;
    }

    try {
      const account = await accounts.getById(invoice.accountId);

      // A tombstone keeps its fiscal rows for retention but never receives mail.
      if (account === null || account.deletedAt) {
        return;
      }

      await notifier.invoiceIssued(
        { email: account.email, locale: account.locale },
        {
          invoiceId: invoice.id,
          uuid: invoice.uuid,
          planName: data.planName,
          amountMinorUnits: data.amountMinorUnits,
          currency: data.currency,
          issuedAt: invoice.createdAt,
          downloadUrl,
          xml: data.xml,
          pdf: data.pdf ?? undefined,
        },
      );
    } catch (error) {
      this.deps.onDeliveryError?.(error, "email", invoice.id);
    }
  }
}
