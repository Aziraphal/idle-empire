import { createTRPCRouter, publicProcedure } from "../trpc";
import { SeasonManager } from "@/lib/season-manager";

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

  // Check and initialize seasons
  checkSeasons: publicProcedure.query(async ({ ctx }) => {
    try {
      const seasonManager = new SeasonManager(ctx.prisma);
      
      // Get current season
      const currentSeason = await seasonManager.getCurrentSeason();
      
      // Get all seasons
      const allSeasons = await ctx.prisma.season.findMany({
        orderBy: { number: 'asc' }
      });

      return {
        status: "ok",
        currentSeason,
        allSeasons,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Debug seasons error:", error);
      throw new Error(`Season check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }),

  // Initialize first season if none exists
  initSeason: publicProcedure.query(async ({ ctx }) => {
    try {
      const seasonManager = new SeasonManager(ctx.prisma);
      
      // Check if season 1 exists
      const season1 = await ctx.prisma.season.findUnique({
        where: { number: 1 }
      });

      if (!season1) {
        // Initialize season 1
        await seasonManager.initializeSeason(1);
        await seasonManager.startSeason(1);
        
        return {
          status: "initialized",
          message: "Season 1 created and started",
          timestamp: new Date().toISOString()
        };
      } else if (season1.status !== "ACTIVE") {
        // Start season 1 if it exists but isn't active
        await seasonManager.startSeason(1);
        
        return {
          status: "activated",
          message: "Season 1 activated",
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          status: "already_active",
          message: "Season 1 is already active",
          currentSeason: season1,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error("Debug init season error:", error);
      throw new Error(`Season init failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }),

  // Check user quests and initialize tutorial if needed
  checkQuests: publicProcedure.query(async ({ ctx }) => {
    try {
      // Get a test user (first user in DB)
      const user = await ctx.prisma.user.findFirst();
      
      if (!user) {
        return {
          status: "no_users",
          message: "No users found in database"
        };
      }

      // Get user's quests
      const playerQuests = await ctx.prisma.playerQuest.findMany({
        where: { userId: user.id },
        include: { quest: true },
        orderBy: { createdAt: 'asc' }
      });

      // Get all available quests
      const allQuests = await ctx.prisma.quest.findMany({
        orderBy: { key: 'asc' }
      });

      return {
        status: "ok",
        userId: user.id,
        username: user.username,
        playerQuests: playerQuests.length,
        allQuests: allQuests.length,
        quests: playerQuests.map(pq => ({
          key: pq.quest.key,
          status: pq.status,
          progress: pq.progress,
          objectives: pq.quest.objectives
        })),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Debug quests error:", error);
      throw new Error(`Quest check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }),
});