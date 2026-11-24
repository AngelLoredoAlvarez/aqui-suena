import {
  ConflictError,
  DataIntegrityError,
  NotFoundError,
  UpgradeRequired,
  ValidationError,
} from "@aqui-suena/api/shared/domain-error";
import { initTRPC, TRPCError } from "@trpc/server";

export type User = {
  id: string;
  accountId: string;
};

export type Context = {
  user: User | null;
  origin?: string;
};

const t = initTRPC.context<Context>().create();

export const router = t.router;

/**
 * Maps domain failures to tRPC codes. A persisted-value failure is logged by
 * field name only and answered generically so the offending value never leaks.
 */
const mapDomainErrors = t.middleware(async ({ next }) => {
  const result = await next();

  // tRPC captures downstream errors in the result instead of throwing, so the
  // original cause is inspected here rather than in a try/catch.
  if (!result.ok) {
    const error = result.error.cause;

    if (error instanceof DataIntegrityError) {
      console.error("Data integrity error", { field: error.field });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
        cause: error,
      });
    }

    if (error instanceof ValidationError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message, cause: error });
    }

    if (error instanceof NotFoundError) {
      throw new TRPCError({ code: "NOT_FOUND", message: error.message, cause: error });
    }

    if (error instanceof ConflictError) {
      throw new TRPCError({ code: "CONFLICT", message: error.message, cause: error });
    }

    if (error instanceof UpgradeRequired) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `${error.code}: ${error.hint}`,
        cause: error,
      });
    }
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
