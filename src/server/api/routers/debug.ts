import { createTRPCRouter, publicProcedure } from "../trpc";

export const debugRouter = createTRPCRouter({
  // Simple test endpoint that doesn't require auth or DB
  ping: publicProcedure.query(() => {
    return {
      message: "pong",
      timestamp: new Date().toISOString(),
      status: "ok"
    };
  }),

  // Test database connection without auth
  testDb: publicProcedure.query(async ({ ctx }) => {
    try {
      // Simple database test
      const result = await ctx.prisma.$queryRaw`SELECT 1 as test`;
      
      // Test if basic tables exist
      const userCount = await ctx.prisma.user.count();
      
      return {
        status: "connected",
        userCount,
        testQuery: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Debug DB test error:", error);
      throw new Error(`Database test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }),
});