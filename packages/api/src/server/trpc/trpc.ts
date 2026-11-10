import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { initTRPC, TRPCError } from "@trpc/server";

export type User = {
  id: string;
  accountId: string;
};

export type Context = {
  user: User | null;
};

const t = initTRPC.context<Context>().create();

export const router = t.router;

/**
 * Maps domain failures to tRPC codes. A persisted-value failure is a server
 * bug: it is logged with its field and value and answered with a generic
 * message so the offending value never reaches the client.
 */
const mapDomainErrors = t.middleware(async ({ next }) => {
  const result = await next();

  // tRPC captures downstream errors in the result instead of throwing, so the
  // original cause is inspected here rather than in a try/catch.
  if (!result.ok && result.error.cause instanceof DataIntegrityError) {
    const error = result.error.cause;
    console.error("Data integrity error", { field: error.field, value: error.value });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      cause: error,
    });
  }

  return result;
});

export const publicProcedure = t.procedure.use(mapDomainErrors);

// Procedure that requires an authenticated user. Throws UNAUTHORIZED otherwise.
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx: { user: ctx.user } });
});

export const protectedProcedure = publicProcedure.use(isAuthed);
