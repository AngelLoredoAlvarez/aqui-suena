import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import { fiscalProfileSchema } from "@aqui-suena/api/domain/accounts/fiscal-profile";
import type {
  CfdiDocumentLinker,
  CfdiInvoice,
  CfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import type { IssueInvoice } from "@aqui-suena/api/domain/billing/invoices/issue-invoice";
import { protectedProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { offsetPageEntries } from "@aqui-suena/api/shared/pagination/input";
import { TRPCError } from "@trpc/server";
import * as v from "valibot";

export type BillingRouterDeps = {
  readonly account: AccountRepository;
  readonly issueInvoice?: Pick<IssueInvoice, "execute">;
  readonly invoices?: CfdiInvoiceRepository;
  readonly documents?: CfdiDocumentLinker;
};

const DOCUMENT_TYPES = {
  pdf: { key: "pdfKey", contentType: "application/pdf" },
  xml: { key: "xmlKey", contentType: "application/xml" },
} as const;

const downloadInput = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  format: v.picklist(["pdf", "xml"]),
});

function toInvoiceSummary(invoice: CfdiInvoice) {
  return {
    id: invoice.id,
    uuid: invoice.uuid,
    issuedAt: invoice.createdAt,
    hasXml: invoice.xmlKey !== null,
    hasPdf: invoice.pdfKey !== null,
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

          const page = await invoices.listByAccount({
            accountId: ctx.user.accountId,
            limit: input.limit,
            offset: input.offset,
          });

          return { ...page, items: page.items.map(toInvoiceSummary) };
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
  });
}
