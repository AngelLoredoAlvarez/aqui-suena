import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import { fiscalProfileSchema } from "@aqui-suena/api/domain/billing/fiscal/fiscal-profile";
import type { IssueInvoice } from "@aqui-suena/api/domain/billing/invoices/issue-invoice";
import { protectedProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { TRPCError } from "@trpc/server";

export type BillingRouterDeps = {
  readonly account: AccountRepository;
  readonly issueInvoice?: Pick<IssueInvoice, "execute">;
};

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
  });
}
