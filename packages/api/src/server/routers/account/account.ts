import type { AccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type { DeleteAccount } from "@aqui-suena/api/domain/accounts/delete-account";
import { protectedProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import * as v from "valibot";

const preferencesInput = v.object({
  renewalRemindersEnabled: v.boolean(),
});

export type AccountRouterDeps = {
  readonly account?: Pick<AccountRepository, "getById" | "updateRenewalRemindersEnabled">;
  readonly deleteAccount?: Pick<DeleteAccount, "execute">;
};

export function createAccountRouter(deps: AccountRouterDeps) {
  return router({
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      const accountRepository = deps.account;

      if (accountRepository === undefined) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Account preferences are not configured",
        });
      }

      const account = await accountRepository.getById(ctx.user.accountId);

      if (account === null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
      }

      return { renewalRemindersEnabled: account.renewalRemindersEnabled ?? true };
    }),

    updatePreferences: protectedProcedure
      .input(preferencesInput)
      .mutation(async ({ ctx, input }) => {
        const accountRepository = deps.account;

        if (accountRepository === undefined) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Account preferences are not configured",
          });
        }

        await accountRepository.updateRenewalRemindersEnabled(
          ctx.user.accountId,
          input.renewalRemindersEnabled,
        );

        return { renewalRemindersEnabled: input.renewalRemindersEnabled };
      }),

    // No input on purpose: the account comes from the session, never the client.
    delete: protectedProcedure.mutation(async ({ ctx }) => {
      const deleteAccount = deps.deleteAccount;

      if (deleteAccount === undefined) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Account deletion is not configured",
        });
      }

      await deleteAccount.execute(ctx.user.accountId);

      return { deleted: true };
    }),
  });
}
