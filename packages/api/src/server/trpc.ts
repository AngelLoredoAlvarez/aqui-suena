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

export const publicProcedure = t.procedure;

// Procedure that requires an authenticated user. Throws UNAUTHORIZED otherwise.
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx: { user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(isAuthed);
