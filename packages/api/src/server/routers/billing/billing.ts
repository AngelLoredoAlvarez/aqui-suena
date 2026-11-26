import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import { fiscalProfileSchema } from "@aqui-suena/api/domain/accounts/fiscal-profile";
import {
  CFDI_CANCELLATION_MOTIVES,
  type CfdiDocumentLinker,
  type CfdiInvoice,
  type CfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/model/invoice";
import type { CancelInvoice } from "@aqui-suena/api/domain/billing/invoices/use-cases/cancel-invoice";
import type { IssueInvoice } from "@aqui-suena/api/domain/billing/invoices/use-cases/issue-invoice";
import type { ReconcileCancellations } from "@aqui-suena/api/domain/billing/invoices/use-cases/reconcile-cancellations";
import type {
  Payment,
  PaymentRepository,
} from "@aqui-suena/api/domain/billing/payments/model/payment";
import type { CheckoutService } from "@aqui-suena/api/domain/billing/payments/use-cases/checkout-service";
import { protectedProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { offsetPageEntries } from "@aqui-suena/api/shared/pagination/input";
import { TRPCError } from "@trpc/server";
import * as v from "valibot";

export type BillingRouterDeps = {
  readonly account: AccountRepository;
  readonly checkout?: Pick<CheckoutService, "execute">;
  readonly payments?: PaymentRepository;
  readonly issueInvoice?: Pick<IssueInvoice, "execute">;
  readonly invoices?: CfdiInvoiceRepository;
  readonly documents?: CfdiDocumentLinker;
  readonly cancelInvoice?: Pick<CancelInvoice, "execute">;
  readonly reconcile?: Pick<ReconcileCancellations, "execute">;
};

const DOCUMENT_TYPES = {
  pdf: { key: "pdfKey", contentType: "application/pdf" },
  xml: { key: "xmlKey", contentType: "application/xml" },
} as const;

const downloadInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  format: v.picklist(["pdf", "xml"]),
});

const cancelInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  motive: v.picklist(CFDI_CANCELLATION_MOTIVES),
});

const checkoutInput = v.object({
  planId: v.picklist(["trades", "commerce"]),
  billingInterval: v.picklist(["monthly", "annual"]),
  method: v.picklist(["card", "cash", "spei"]),
  idempotencyKey: v.pipe(v.string(), v.minLength(8), v.maxLength(128)),
  cardToken: v.optional(v.pipe(v.string(), v.minLength(1))),
  customerName: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120)),
  customerPhone: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(32))),
});

const paymentIdInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
});

function toPaymentView(payment: Payment) {
  return {
    id: payment.id,
    status: payment.status,
    method: payment.method,
    billingInterval: payment.billingInterval,
    amount: payment.amount,
    currency: payment.currency,
    reference: payment.reference,
    nextActionUrl: payment.nextActionUrl,
    expiresAt: payment.expiresAt,
    failureReason: payment.failureReason,
    periodStart: payment.periodStart,
    periodEnd: payment.periodEnd,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
  };
}

function toInvoiceSummary(invoice: CfdiInvoice) {
  return {
    id: invoice.id,
    uuid: invoice.uuid,
    issuedAt: invoice.createdAt,
    status: invoice.status,
    hasXml: invoice.xmlKey !== null,
    hasPdf: invoice.pdfKey !== null,
    cancellationMotive: invoice.cancellationMotive,
    cancellationResolvedAt: invoice.cancellationResolvedAt,
    cancellationExpiresAt: invoice.cancellationExpiresAt,
    cancellationDetail: invoice.cancellationDetail,
    substitutionUuid: invoice.substitutionUuid,
  };
}

export function createBillingRouter(deps: BillingRouterDeps) {
  return router({
    getFiscalProfile: protectedProcedure.query(async ({ ctx }) => ({
      fiscalProfile: await deps.account.getFiscalProfile(ctx.user.accountId),
    })),

    updateFiscalProfile: protectedProcedure
      .input(fiscalProfileSchema)
      .mutation(async ({ input, ctx }) => {
        await deps.account.updateFiscalProfile(ctx.user.accountId, input);

        return { fiscalProfile: input };
      }),

    requestInvoice: protectedProcedure.mutation(async ({ ctx }) => {
      const issueInvoice = deps.issueInvoice;

      if (issueInvoice === undefined) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Invoice issuing is not configured",
        });
      }

      const invoice = await issueInvoice.execute(ctx.user.accountId);

      return {
        invoice: {
          id: invoice.id,
          status: invoice.status,
          uuid: invoice.uuid,
          issuedAt: invoice.createdAt,
        },
      };
    }),

    invoices: router({
      list: protectedProcedure
        .input(v.optional(v.object(offsetPageEntries), { limit: 20, offset: 0 }))
        .query(async ({ input, ctx }) => {
          const invoices = deps.invoices;

          if (invoices === undefined) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Invoice history is not configured",
            });
          }

          // A pending cancellation resolves on the SAT's clock; reading the
          // history is the cheapest moment to ask.
          await deps.reconcile?.execute({ accountId: ctx.user.accountId });

          const page = await invoices.listByAccount({
            accountId: ctx.user.accountId,
            limit: input.limit,
            offset: input.offset,
          });

          return { ...page, items: page.items.map(toInvoiceSummary) };
        }),

      cancel: protectedProcedure.input(cancelInput).mutation(async ({ input, ctx }) => {
        const cancelInvoice = deps.cancelInvoice;

        if (cancelInvoice === undefined) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Invoice cancellation is not configured",
          });
        }

        const invoice = await cancelInvoice.execute({
          accountId: ctx.user.accountId,
          invoiceId: input.id,
          motive: input.motive,
        });

        return { invoice: toInvoiceSummary(invoice) };
      }),

      downloadUrl: protectedProcedure.input(downloadInput).query(async ({ input, ctx }) => {
        const { invoices, documents } = deps;

        if (invoices === undefined || documents === undefined) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Invoice downloads are not configured",
          });
        }

        const invoice = await invoices.getByIdForAccount(ctx.user.accountId, input.id);

        if (invoice === null) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
        }

        const documentType = DOCUMENT_TYPES[input.format];
        const key = input.format === "pdf" ? invoice.pdfKey : invoice.xmlKey;

        // A missing archive is not a missing invoice: the row exists, the file does not.
        if (key === null) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `This invoice has no ${input.format.toUpperCase()} available`,
          });
        }

        const fileName = `CFDI-${invoice.uuid ?? invoice.id}.${input.format}`;

        return {
          url: await documents.signedDownloadUrl({
            key,
            fileName,
            contentType: documentType.contentType,
          }),
          fileName,
          expiresInSeconds: 300,
        };
      }),
    }),

    checkout: router({
      create: protectedProcedure.input(checkoutInput).mutation(async ({ ctx, input }) => {
        const checkout = deps.checkout;

        if (checkout === undefined) {
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            message: "Payments are not configured",
          });
        }

        const account = await deps.account.getById(ctx.user.accountId);

        if (account === null) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
        }

        const payment = await checkout.execute({
          accountId: ctx.user.accountId,
          planId: input.planId,
          billingInterval: input.billingInterval,
          method: input.method,
          idempotencyKey: input.idempotencyKey,
          ...(input.cardToken === undefined ? {} : { cardToken: input.cardToken }),
          customer: {
            name: input.customerName,
            email: account.email,
            ...(input.customerPhone === undefined ? {} : { phone: input.customerPhone }),
          },
        });

        return { payment: toPaymentView(payment) };
      }),
    }),

    payments: router({
      get: protectedProcedure.input(paymentIdInput).query(async ({ ctx, input }) => {
        const payments = deps.payments;

        if (payments === undefined) {
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            message: "Payments are not configured",
          });
        }

        const payment = await payments.getById(input.id);

        if (payment === null || payment.accountId !== ctx.user.accountId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
        }

        return { payment: toPaymentView(payment) };
      }),
    }),
  });
}
