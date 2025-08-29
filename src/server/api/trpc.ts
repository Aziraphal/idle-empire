import { initTRPC, TRPCError } from "@trpc/server";
import { type Context } from "../trpc/context";
import superjson from "superjson";
import { SeasonManager } from "@/lib/season-manager";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Middleware to ensure active season exists
const ensureActiveSeason = t.middleware(async ({ ctx, next }) => {
  const seasonManager = new SeasonManager(ctx.prisma);
  
  try {
    let currentSeason = await seasonManager.getCurrentSeason();
    
    // If no active season, initialize and start season 1
    if (!currentSeason) {
      const season1 = await ctx.prisma.season.findUnique({
        where: { number: 1 }
      });
      
      if (!season1) {
        await seasonManager.initializeSeason(1);
      }
      await seasonManager.startSeason(1);
    }
  } catch (error) {
    console.error('Season initialization error:', error);
    // Continue anyway - don't block the request
  }
  
  return next();
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

// Protected procedure (requires auth and ensures active season)
export const protectedProcedure = t.procedure.use(ensureActiveSeason).use(isAuthed);

// Create router
export const createTRPCRouter = t.router;