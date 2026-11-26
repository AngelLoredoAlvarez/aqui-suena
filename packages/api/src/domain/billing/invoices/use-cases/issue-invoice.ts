import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type {
  CfdiDocumentStore,
  CfdiInvoice,
  CfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/model/invoice";
import type { CfdiNotifier } from "@aqui-suena/api/domain/billing/invoices/ports/cfdi-notifier";
import {
  type InvoiceIssuer,
  type InvoicePaymentForm,
  InvoiceProviderRejection,
} from "@aqui-suena/api/domain/billing/invoices/ports/invoice-issuer";
import type {
  Payment,
  PaymentRepository,
} from "@aqui-suena/api/domain/billing/payments/model/payment";
import type { PlanRepository } from "@aqui-suena/api/domain/plans/plans";
import {
  DataIntegrityError,
  NotFoundError,
  ValidationError,
} from "@aqui-suena/api/shared/domain-error";

export type IssueInvoiceDependencies = {
  readonly fiscalProfiles: Pick<AccountRepository, "getFiscalProfile">;
  readonly payments: Pick<PaymentRepository, "getById" | "getLatestCompletedByAccount">;
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

export type IssueInvoiceOptions = {
  /** Stamps for this payment instead of the account's latest completed one. */
  readonly paymentId?: string;
  /** Relation `04`: the stamped CFDI substitutes this UUID. */
  readonly substitutesUuid?: string;
};

export class IssueInvoice {
  private readonly deps: IssueInvoiceDependencies;

  constructor(deps: IssueInvoiceDependencies) {
    this.deps = deps;
  }

  async execute(accountId: string, options: IssueInvoiceOptions = {}): Promise<CfdiInvoice> {
    const now = this.deps.now?.() ?? new Date();

    const payment = await this.resolvePayment(accountId, options);

    if (payment.planId === null) {
      throw new DataIntegrityError("planId", payment.planId);
    }

    const plan = await this.deps.plans.getById(payment.planId);

    if (plan === null) {
      throw new DataIntegrityError("planId", payment.planId);
    }

    const fiscalProfile = await this.deps.fiscalProfiles.getFiscalProfile(accountId);

    if (fiscalProfile === null) {
      throw new ValidationError(
        "fiscalProfile: complete the fiscal data before requesting an invoice",
      );
    }

    try {
      const issued = await this.deps.issuer.issue({
        accountId,
        planId: payment.planId,
        planName: plan.name,
        amountCents: payment.amount,
        currency: payment.currency,
        fiscalProfile,
        issuedAt: now,
        paymentForm: paymentForm(payment.method),
        ...(options.substitutesUuid === undefined
          ? {}
          : { substitutesUuid: options.substitutesUuid }),
      });

      const xmlKey = await this.tryArchiveXml(accountId, issued.xml);
      const pdf = await this.tryDownloadPdf(issued.providerId);
      const pdfKey = pdf === null ? null : await this.tryArchivePdf(accountId, pdf);

      const invoice = await this.deps.invoices.create({
        accountId,
        paymentId: payment.id,
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
        substitutionUuid: null,
      });

      await this.tryNotify(invoice, {
        planName: plan.name,
        amountMinorUnits: payment.amount,
        currency: payment.currency,
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
        paymentId: payment.id,
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
        substitutionUuid: null,
      });

      throw error;
    }
  }

  private async resolvePayment(accountId: string, options: IssueInvoiceOptions): Promise<Payment> {
    if (options.substitutesUuid !== undefined && options.paymentId === undefined) {
      throw new ValidationError("paymentId: a substitute CFDI needs the payment it corrects");
    }

    if (options.paymentId === undefined) {
      const payment = await this.deps.payments.getLatestCompletedByAccount(accountId);

      if (payment === null) {
        throw new ValidationError("A completed payment is required before requesting an invoice");
      }

      return payment;
    }

    const payment = await this.deps.payments.getById(options.paymentId);

    // A foreign payment answers like a missing one: the client never learns that
    // another account owns the id.
    if (payment === null || payment.accountId !== accountId) {
      throw new NotFoundError("Payment not found");
    }

    return payment;
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

function paymentForm(method: Payment["method"]): InvoicePaymentForm {
  switch (method) {
    case "card":
      return "04";
    case "cash":
      return "01";
    case "spei":
      return "03";
  }
}
