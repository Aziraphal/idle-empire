import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getEligibleEnemies, selectRandomEnemy } from "@/lib/enemy-data";
import { calculateDefenseForce, resolveCombat } from "@/lib/combat-engine";

export const combatRouter = createTRPCRouter({
  // Get all active raids for user's provinces
  getActiveRaids: protectedProcedure.query(async ({ ctx }) => {
    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        provinces: {
          include: {
            raids: {
              where: { resolved: false },
              orderBy: { arrivalTime: 'asc' }
            }
          }
        }
      }
    });

    if (!city) {
      throw new TRPCError({ code: "NOT_FOUND", message: "City not found" });
    }

    // Flatten raids from all provinces
    const activeRaids = city.provinces.flatMap(province => 
      province.raids.map(raid => ({
        ...raid,
        provinceName: province.name,
        timeUntilArrival: Math.max(0, raid.arrivalTime.getTime() - Date.now()),
        isImminent: raid.arrivalTime.getTime() - Date.now() < 30 * 60 * 1000 // 30 minutes
      }))
    );

    return activeRaids;
  }),

  // Generate a raid on a specific province
  generateRaid: protectedProcedure
    .input(z.object({ provinceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get province with full context
      const province = await ctx.prisma.province.findUnique({
        where: { id: input.provinceId },
        include: {
          city: true,
          stocks: true,
          buildings: true,
          governor: true,
          raids: {
            where: { resolved: false }
          }
        }
      });

      if (!province || province.city.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Province not found" });
      }

      // Check if province already has an active raid
      if (province.raids.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Province already under attack" });
      }

      // Build province context for enemy selection
      const availableResources = province.stocks.reduce((acc, stock) => {
        acc[stock.type.toLowerCase()] = stock.amount;
        return acc;
      }, {} as Record<string, number>);

      // Get eligible enemies
      const eligibleEnemies = getEligibleEnemies(
        province.level,
        province.threat,
        availableResources
      );

      const selectedEnemy = selectRandomEnemy(eligibleEnemies);
      if (!selectedEnemy) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No eligible enemies for this province" });
      }

      // Calculate raid timing (10-30 minutes to prepare)
      const preparationMinutes = Math.floor(Math.random() * 20) + 10; // 10-30 minutes
      const arrivalTime = new Date(Date.now() + preparationMinutes * 60 * 1000);

      // Create raid event
      const raid = await ctx.prisma.raidEvent.create({
        data: {
          provinceId: province.id,
          enemyType: selectedEnemy.type as any,
          enemyName: selectedEnemy.name,
          enemyStrength: selectedEnemy.strength,
          enemyThreatLevel: selectedEnemy.threatLevel,
          arrivalTime,
          preparationTime: preparationMinutes
        }
      });

      return {
        raid: {
          ...raid,
          provinceName: province.name,
          enemyData: selectedEnemy,
          timeUntilArrival: preparationMinutes * 60 * 1000
        }
      };
    }),

  // Auto-resolve a raid (when no player input)
  autoResolveRaid: protectedProcedure
    .input(z.object({ raidId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const raid = await ctx.prisma.raidEvent.findUnique({
        where: { id: input.raidId },
        include: {
          province: {
            include: {
              city: true,
              stocks: true,
              buildings: true,
              governor: true
            }
          }
        }
      });

      if (!raid || raid.province.city.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Raid not found" });
      }

      if (raid.resolved) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Raid already resolved" });
      }

      // Get enemy data from our database
      const { ENEMY_FORCES } = await import("@/lib/enemy-data");
      const enemyKey = Object.keys(ENEMY_FORCES).find(key => 
        ENEMY_FORCES[key].name === raid.enemyName
      );
      
      if (!enemyKey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Enemy data not found" });
      }

      const enemy = ENEMY_FORCES[enemyKey];

      // Calculate defense force
      const defense = calculateDefenseForce(raid.province);

      // Resolve combat automatically
      const combatResult = resolveCombat(enemy, defense);

      // Apply resource changes
      const resourceChanges = { ...combatResult.resourcesGained };
      Object.entries(combatResult.resourcesLost).forEach(([resource, amount]) => {
        resourceChanges[resource] = (resourceChanges[resource] || 0) + amount;
      });

      // Update province resources
      const updatePromises = Object.entries(resourceChanges).map(async ([resource, change]) => {
        if (change === 0) return null;

        const resourceType = resource.toUpperCase() as any;
        const stock = raid.province.stocks.find(s => s.type === resourceType);
        
        if (stock) {
          const newAmount = Math.max(0, stock.amount + change);
          return ctx.prisma.resourceStock.update({
            where: { id: stock.id },
            data: { amount: newAmount }
          });
        }
        return null;
      });

      await Promise.all(updatePromises);

      // Update governor if applicable
      if (raid.province.governor && (combatResult.governorLoyaltyChange !== 0 || combatResult.governorXpGain !== 0)) {
        await ctx.prisma.governor.update({
          where: { id: raid.province.governor.id },
          data: {
            loyalty: Math.max(0, Math.min(100, raid.province.governor.loyalty + combatResult.governorLoyaltyChange)),
            xp: raid.province.governor.xp + combatResult.governorXpGain
          }
        });
      }

      // Update raid as resolved
      await ctx.prisma.raidEvent.update({
        where: { id: input.raidId },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          combatOutcome: combatResult.outcome as any,
          victoryCertainty: combatResult.victoryCertainty,
          defenderCasualties: combatResult.defenderCasualties,
          enemyCasualties: combatResult.enemyCasualties,
          infrastructureDamage: combatResult.infrastructureDamage,
          resourcesGained: combatResult.resourcesGained,
          resourcesLost: combatResult.resourcesLost,
          governorXpGained: combatResult.governorXpGain,
          governorLoyaltyChange: combatResult.governorLoyaltyChange,
          populationMoraleChange: combatResult.populationMoraleChange,
          battleReport: combatResult.battleReport,
          strategy: 'AUTO_DEFEND'
        }
      });

      return {
        success: true,
        combatResult,
        message: combatResult.battleReport
      };
    }),

  // Get combat history for a province
  getCombatHistory: protectedProcedure
    .input(z.object({ 
      provinceId: z.string().optional(),
      limit: z.number().min(1).max(50).default(20)
    }))
    .query(async ({ ctx, input }) => {
      const whereCondition: any = {
        province: { city: { userId: ctx.userId } },
        resolved: true
      };

      if (input.provinceId) {
        whereCondition.provinceId = input.provinceId;
      }

      const raids = await ctx.prisma.raidEvent.findMany({
        where: whereCondition,
        include: {
          province: { select: { name: true } }
        },
        orderBy: { resolvedAt: 'desc' },
        take: input.limit
      });

      return raids;
    }),

  // Get province defense statistics
  getDefenseStats: protectedProcedure
    .input(z.object({ provinceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const province = await ctx.prisma.province.findUnique({
        where: { id: input.provinceId },
        include: {
          city: true,
          stocks: true,
          buildings: true,
          governor: true,
          raids: {
            where: { resolved: true },
            take: 10,
            orderBy: { resolvedAt: 'desc' }
          }
        }
      });

      if (!province || province.city.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Province not found" });
      }

      const defense = calculateDefenseForce(province);
      
      // Calculate combat statistics
      const totalBattles = province.raids.length;
      const victories = province.raids.filter(r => r.combatOutcome === 'VICTORY').length;
      const defeats = province.raids.filter(r => r.combatOutcome === 'DEFEAT').length;
      const draws = province.raids.filter(r => r.combatOutcome === 'DRAW').length;

      const winRate = totalBattles > 0 ? victories / totalBattles : 0;

      return {
        province: {
          name: province.name,
          level: province.level,
          threat: province.threat
        },
        defenseForce: defense,
        combatHistory: {
          totalBattles,
          victories,
          defeats,
          draws,
          winRate: Math.round(winRate * 100)
        },
        recentBattles: province.raids
      };
    })
});