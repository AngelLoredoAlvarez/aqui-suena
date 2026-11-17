import type { DeleteAccount } from "@aqui-suena/api/domain/accounts/delete-account";
import { protectedProcedure, router } from "@aqui-suena/api/server/trpc/trpc";
import { TRPCError } from "@trpc/server";

export type AccountRouterDeps = {
  readonly deleteAccount?: Pick<DeleteAccount, "execute">;
};

export function createAccountRouter(deps: AccountRouterDeps) {
  return router({
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
