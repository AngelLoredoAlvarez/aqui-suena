import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import { resolvePlan } from "@aqui-suena/api/domain/ads/ad-plan";
import type {
  CfdiInvoice,
  CfdiInvoiceRepository,
  CfdiXmlStore,
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
  readonly xml: CfdiXmlStore;
  readonly now?: () => Date;
  /** Reports a failed XML archive so the loss stays diagnosable. */
  readonly onArchiveError?: (error: unknown, accountId: string) => void;
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

      return await this.deps.invoices.create({
        accountId,
        paymentId: null,
        status: "issued",
        uuid: issued.uuid,
        providerId: issued.providerId,
        xmlKey,
        failureReason: null,
      });
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
        failureReason: error.detail,
      });

      throw error;
    }
  }

  /** A stamped CFDI cannot be undone: a failed archive records `issued` with no key. */
  private async tryArchiveXml(accountId: string, xml: string): Promise<string | null> {
    try {
      return await this.deps.xml.save({ accountId, xml });
    } catch (error) {
      this.deps.onArchiveError?.(error, accountId);

      return null;
    }
  }
}
