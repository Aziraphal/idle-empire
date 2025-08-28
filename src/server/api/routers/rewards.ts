import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { RewardManager } from "@/lib/reward-manager";
import { TitleRarity, TitleCategory, BonusType, AchievementCategory } from "@prisma/client";

export const rewardsRouter = createTRPCRouter({
  getUserRewards: protectedProcedure.query(async ({ ctx }) => {
    const rewardManager = new RewardManager(ctx.prisma);
    return await rewardManager.getUserRewards(ctx.userId);
  }),

  getActiveTitle: protectedProcedure.query(async ({ ctx }) => {
    const rewardManager = new RewardManager(ctx.prisma);
    return await rewardManager.getActiveTitle(ctx.userId);
  }),

  setActiveTitle: protectedProcedure
    .input(z.object({
      titleId: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rewardManager = new RewardManager(ctx.prisma);
      return await rewardManager.setActiveTitle(ctx.userId, input.titleId);
    }),

  getUserBonuses: protectedProcedure.query(async ({ ctx }) => {
    const rewardManager = new RewardManager(ctx.prisma);
    return await rewardManager.calculateUserBonuses(ctx.userId);
  }),

  checkAchievements: protectedProcedure.mutation(async ({ ctx }) => {
    const rewardManager = new RewardManager(ctx.prisma);
    
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      include: {
        cities: true,
        provinces: true,
        playerTechnologies: true,
        combatLogs: {
          where: {
            OR: [
              { attackerId: ctx.userId },
              { defenderId: ctx.userId }
            ]
          }
        },
        playerBuildings: true,
        membership: {
          include: {
            alliance: true
          }
        }
      },
    });

    if (!user) return [];

    const totalPopulation = user.cities.reduce((sum, city) => sum + city.population, 0);
    const totalCities = user.cities.length;
    const totalProvinces = user.provinces.length;
    const totalResources = user.gold + user.food + user.wood + user.stone + user.iron;
    const totalTechnologies = user.playerTechnologies.length;
    const totalCombatsWon = user.combatLogs.filter(log => 
      (log.attackerId === ctx.userId && log.attackerVictory) ||
      (log.defenderId === ctx.userId && !log.attackerVictory)
    ).length;
    const totalBuildings = user.playerBuildings.length;

    return await rewardManager.checkAchievements(ctx.userId, {
      totalPopulation,
      totalCities,
      totalProvinces,
      totalResources,
      totalTechnologies,
      totalCombatsWon,
      totalBuildings,
    });
  }),

  grantTitle: protectedProcedure
    .input(z.object({
      titleId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rewardManager = new RewardManager(ctx.prisma);
      return await rewardManager.grantTitle(ctx.userId, input.titleId);
    }),

  grantBonus: protectedProcedure
    .input(z.object({
      bonusId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rewardManager = new RewardManager(ctx.prisma);
      return await rewardManager.grantBonus(ctx.userId, input.bonusId);
    }),

  grantCosmetic: protectedProcedure
    .input(z.object({
      cosmeticId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rewardManager = new RewardManager(ctx.prisma);
      return await rewardManager.grantCosmetic(ctx.userId, input.cosmeticId);
    }),

  getAllTitles: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.title.findMany({
      orderBy: [
        { rarity: 'asc' },
        { name: 'asc' }
      ],
    });
  }),

  getAllBonuses: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.bonus.findMany({
      orderBy: { name: 'asc' },
    });
  }),

  getAllAchievements: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.achievement.findMany({
      orderBy: [
        { category: 'asc' },
        { targetValue: 'asc' }
      ],
    });
  }),

  getAllCosmetics: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.cosmetic.findMany({
      orderBy: { name: 'asc' },
    });
  }),

  initializeRewards: protectedProcedure.mutation(async ({ ctx }) => {
    const rewardManager = new RewardManager(ctx.prisma);
    await rewardManager.initializeRewards();
    return { success: true };
  }),

  getLeaderboard: protectedProcedure
    .input(z.object({
      category: z.enum(['titles', 'achievements', 'bonuses']).default('titles'),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      if (input.category === 'titles') {
        const users = await ctx.prisma.user.findMany({
          include: {
            playerTitles: {
              include: { title: true }
            },
            activeTitle: true,
          },
          orderBy: { playerTitles: { _count: 'desc' } },
          take: input.limit,
        });

        return users.map(user => ({
          id: user.id,
          username: user.username,
          totalTitles: user.playerTitles.length,
          activeTitle: user.activeTitle,
          rarestitles: user.playerTitles.filter(pt => 
            pt.title.rarity === TitleRarity.LEGENDARY || pt.title.rarity === TitleRarity.EPIC
          ).length,
        }));
      }

      if (input.category === 'achievements') {
        const users = await ctx.prisma.user.findMany({
          include: {
            playerAchievements: {
              where: { completedAt: { not: null } },
              include: { achievement: true }
            }
          },
          orderBy: { playerAchievements: { _count: 'desc' } },
          take: input.limit,
        });

        return users.map(user => ({
          id: user.id,
          username: user.username,
          totalAchievements: user.playerAchievements.length,
          completedAchievements: user.playerAchievements.filter(pa => pa.completedAt).length,
        }));
      }

      return [];
    }),
});