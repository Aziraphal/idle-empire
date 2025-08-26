import { initTRPC, TRPCError } from "@trpc/server";
import { type Context } from "./context";
import superjson from "superjson";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Middleware for authenticated routes
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId, // Non-nullable userId
    },
  });
});

// Public procedure
export const publicProcedure = t.procedure;

// Protected procedure (requires auth)  
export const protectedProcedure = t.procedure.use(isAuthed);

// Create router
export const createTRPCRouter = t.router;