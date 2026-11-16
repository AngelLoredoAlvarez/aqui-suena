import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import { fiscalProfileSchema } from "@aqui-suena/api/domain/billing/fiscal/fiscal-profile";
import { protectedProcedure, router } from "@aqui-suena/api/server/trpc/trpc";

export type BillingRouterDeps = {
  readonly account: AccountRepository;
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
  });
}
