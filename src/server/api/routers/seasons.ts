import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";
import { SeasonManager } from "@/lib/season-manager";
import { RankingType } from "@prisma/client";

export const seasonsRouter = createTRPCRouter({
  // Get current season info
  getCurrentSeason: publicProcedure.query(async ({ ctx }) => {
    const seasonManager = new SeasonManager(ctx.prisma);
    const season = await seasonManager.getCurrentSeason();
    
    if (!season) {
      return null;
    }

    return {
      ...season,
      isActive: season.status === "ACTIVE",
      daysRemaining: season.endDate 
        ? Math.max(0, Math.ceil((season.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null,
    };
  }),

  // Get player's season progress
  getMySeasonProgress: protectedProcedure.query(async ({ ctx }) => {
    const seasonManager = new SeasonManager(ctx.prisma);
    const currentSeason = await seasonManager.getCurrentSeason();
    
    if (!currentSeason) {
      return null;
    }

    const playerSeason = await ctx.prisma.playerSeason.findUnique({
      where: {
        userId_seasonId: {
          userId: ctx.userId,
          seasonId: currentSeason.id
        }
      },
      include: {
        season: true
      }
    });

    if (!playerSeason) {
      // Auto-register user for current season
      return await seasonManager.registerUserForSeason(ctx.userId);
    }

    return playerSeason;
  }),

  // Get season leaderboards
  getLeaderboard: publicProcedure
    .input(z.object({
      seasonId: z.string().optional(),
      rankingType: z.nativeEnum(RankingType).default(RankingType.TOTAL_POWER),
      limit: z.number().min(1).max(1000).default(100),
    }))
    .query(async ({ ctx, input }) => {
      const seasonManager = new SeasonManager(ctx.prisma);
      const currentSeason = await seasonManager.getCurrentSeason();
      
      const targetSeasonId = input.seasonId || currentSeason?.id;
      if (!targetSeasonId) {
        return [];
      }

      const leaderboard = await seasonManager.getSeasonLeaderboard(
        targetSeasonId, 
        input.rankingType, 
        input.limit
      );

      return leaderboard.map((entry, index) => ({
        ...entry,
        displayRank: index + 1,
        scoreFormatted: formatScore(entry.score, input.rankingType),
      }));
    }),

  // Get my ranking in current season
  getMyRanking: protectedProcedure
    .input(z.object({
      rankingType: z.nativeEnum(RankingType).default(RankingType.TOTAL_POWER),
    }))
    .query(async ({ ctx, input }) => {
      const seasonManager = new SeasonManager(ctx.prisma);
      const currentSeason = await seasonManager.getCurrentSeason();
      
      if (!currentSeason) {
        return null;
      }

      const myRanking = await ctx.prisma.seasonRanking.findUnique({
        where: {
          seasonId_userId_rankingType: {
            seasonId: currentSeason.id,
            userId: ctx.userId,
            rankingType: input.rankingType,
          }
        }
      });

      if (!myRanking) {
        // User not ranked yet, update rankings
        await seasonManager.updateRanking(currentSeason.id, input.rankingType);
        
        // Try again
        return await ctx.prisma.seasonRanking.findUnique({
          where: {
            seasonId_userId_rankingType: {
              seasonId: currentSeason.id,
              userId: ctx.userId,
              rankingType: input.rankingType,
            }
          }
        });
      }

      return {
        ...myRanking,
        scoreFormatted: formatScore(myRanking.score, input.rankingType),
      };
    }),

  // Get all seasons (historical)
  getAllSeasons: publicProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.season.findMany({
      orderBy: { number: 'desc' },
      include: {
        _count: {
          select: {
            playerSeasons: true
          }
        }
      }
    });
  }),

  // Get season statistics
  getSeasonStats: publicProcedure
    .input(z.object({
      seasonId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const seasonManager = new SeasonManager(ctx.prisma);
      const currentSeason = await seasonManager.getCurrentSeason();
      
      const targetSeasonId = input.seasonId || currentSeason?.id;
      if (!targetSeasonId) {
        return null;
      }

      const season = await ctx.prisma.season.findUnique({
        where: { id: targetSeasonId },
        include: {
          playerSeasons: true,
          _count: {
            select: {
              playerSeasons: true,
              seasonRankings: true,
            }
          }
        }
      });

      if (!season) {
        return null;
      }

      // Calculate aggregate stats
      const totalPower = season.playerSeasons.reduce((sum, ps) => sum + Number(ps.totalPower), 0);
      const totalTechnologies = season.playerSeasons.reduce((sum, ps) => sum + ps.technologiesCount, 0);
      const totalCombats = season.playerSeasons.reduce((sum, ps) => sum + ps.combatVictories, 0);
      const totalBuildings = season.playerSeasons.reduce((sum, ps) => sum + ps.buildingsBuilt, 0);

      const activePlayers = season.playerSeasons.filter(ps => ps.isActive).length;

      return {
        season: {
          ...season,
          _count: undefined, // Remove this from response
        },
        stats: {
          totalPlayers: season._count.playerSeasons,
          activePlayers,
          totalPower,
          totalTechnologies,
          totalCombats,
          totalBuildings,
          avgPowerPerPlayer: season.playerSeasons.length > 0 
            ? Math.round(totalPower / season.playerSeasons.length) 
            : 0,
        }
      };
    }),

  // Manual ranking update (admin only in real app)
  updateRankings: protectedProcedure
    .input(z.object({
      rankingType: z.nativeEnum(RankingType).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const seasonManager = new SeasonManager(ctx.prisma);
      const currentSeason = await seasonManager.getCurrentSeason();
      
      if (!currentSeason) {
        throw new Error("No active season");
      }

      if (input.rankingType) {
        await seasonManager.updateRanking(currentSeason.id, input.rankingType);
      } else {
        // Update all rankings
        await seasonManager.calculateFinalRankings(currentSeason.id);
      }

      return { success: true };
    }),

  // Update player stats (called by empire system)
  updateMyStats: protectedProcedure
    .input(z.object({
      totalPower: z.bigint().optional(),
      technologiesCount: z.number().optional(),
      combatVictories: z.number().optional(),
      buildingsBuilt: z.number().optional(),
      resourcesEarned: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const seasonManager = new SeasonManager(ctx.prisma);
      
      await seasonManager.updatePlayerStats(ctx.userId, {
        totalPower: input.totalPower,
        technologiesCount: input.technologiesCount,
        combatVictories: input.combatVictories,
        buildingsBuilt: input.buildingsBuilt,
        resourcesEarned: input.resourcesEarned,
      });

      return { success: true };
    }),
});

// Helper function to format scores for display
function formatScore(score: bigint, rankingType: RankingType): string {
  const num = Number(score);
  
  switch (rankingType) {
    case RankingType.TOTAL_POWER:
      return num.toLocaleString() + " Power";
    case RankingType.GROWTH_7D:
    case RankingType.GROWTH_30D:
      return "+" + num.toLocaleString() + " Power";
    case RankingType.TECHNOLOGIES:
      return num + " Tech" + (num !== 1 ? "s" : "");
    case RankingType.COMBAT:
      return num + " Win" + (num !== 1 ? "s" : "");
    case RankingType.WEALTH:
      return num.toLocaleString() + " Gold";
    case RankingType.BUILDINGS:
      return num + " Building" + (num !== 1 ? "s" : "");
    default:
      return num.toLocaleString();
  }
}