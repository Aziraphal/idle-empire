import { createTRPCRouter, protectedProcedure } from "../trpc";
import { calculateIdleProduction } from "@/lib/idle-calculator";
import { ResourceType } from "@prisma/client";
import { runEventScheduler, isProvinceEligibleForEvent } from "@/lib/event-scheduler";
import { SeasonManager } from "@/lib/season-manager";

export const empireRouter = createTRPCRouter({
  getMyEmpire: protectedProcedure.query(async ({ ctx }) => {
    // Get user's city with all related data
    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        provinces: {
          include: {
            stocks: true,
            buildings: true,
            governor: true,
            constructions: {
              where: { status: "PENDING" },
            },
          },
        },
        researches: {
          where: { status: "PENDING" },
        },
        researchedTechnologies: true,
      },
    });

    if (!city) {
      throw new Error("City not found");
    }

    // Process each province for idle production
    const processedProvinces = await Promise.all(
      city.provinces.map(async (province) => {
        // Get researched technologies for this city
        const researchedTechs = city.researchedTechnologies.map(tech => tech.techKey);
        
        // Calculate idle production since last update
        const production = calculateIdleProduction(
          province.buildings,
          province.governor?.personality || null,
          province.lastProduction,
          researchedTechs
        );

        // Update resources if there was idle time
        if (production.timeDelta > 0) {
          // Update resource stocks
          const updatePromises = province.stocks.map(async (stock) => {
            const gained = production.totalGained[stock.type as ResourceType];
            if (gained !== 0) {
              const newAmount = Math.max(0, stock.amount + gained);
              
              return ctx.prisma.resourceStock.update({
                where: { id: stock.id },
                data: { amount: newAmount },
              });
            }
            return stock;
          });

          const updatedStocks = await Promise.all(updatePromises);

          // Update lastProduction timestamp
          await ctx.prisma.province.update({
            where: { id: province.id },
            data: { lastProduction: new Date() },
          });

          // Log the production tick for analytics
          await ctx.prisma.idleTick.create({
            data: {
              provinceId: province.id,
              deltaSecs: Math.floor(production.timeDelta * 3600),
              goldGained: production.totalGained.GOLD,
              foodGained: production.totalGained.FOOD,
              stoneGained: production.totalGained.STONE,
              ironGained: production.totalGained.IRON,
            },
          });

          return {
            ...province,
            stocks: updatedStocks,
            production: {
              gained: production.totalGained,
              hourlyRate: production.hourlyRate,
              timeDelta: production.timeDelta,
            },
          };
        }

        return {
          ...province,
          production: {
            gained: production.totalGained,
            hourlyRate: production.hourlyRate,
            timeDelta: 0,
          },
        };
      })
    );

    return {
      city: {
        ...city,
        provinces: processedProvinces,
      },
    };
  }),

  // Get production summary for dashboard
  getProductionSummary: protectedProcedure.query(async ({ ctx }) => {
    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        provinces: {
          include: {
            buildings: true,
            governor: true,
            stocks: true,
          },
        },
        researchedTechnologies: true,
      },
    });

    if (!city) {
      throw new Error("City not found");
    }

    // Calculate total empire production rates
    let totalHourlyRate: Record<ResourceType, number> = {
      GOLD: 0,
      FOOD: 0,
      STONE: 0,
      IRON: 0,
      POP: 0,
      INFLUENCE: 0,
    };

    let totalResources: Record<ResourceType, number> = {
      GOLD: 0,
      FOOD: 0,
      STONE: 0,
      IRON: 0,
      POP: 0,
      INFLUENCE: 0,
    };

    // Get researched technologies for this city
    const researchedTechs = city.researchedTechnologies.map(tech => tech.techKey);

    city.provinces.forEach((province) => {
      // Calculate hourly rates for this province
      const production = calculateIdleProduction(
        province.buildings,
        province.governor?.personality || null,
        province.lastProduction,
        researchedTechs
      );

      // Add to empire totals
      Object.entries(production.hourlyRate).forEach(([resource, rate]) => {
        const resourceType = resource as ResourceType;
        totalHourlyRate[resourceType] += rate;
      });

      // Sum up current resources
      province.stocks.forEach((stock) => {
        totalResources[stock.type as ResourceType] += stock.amount;
      });
    });

    return {
      resources: totalResources,
      productionRates: totalHourlyRate,
      provinceCount: city.provinces.length,
      governorCount: city.provinces.filter((p) => p.governor).length,
    };
  }),

  // Periodic maintenance: process idle production AND trigger event generation
  processIdleAndEvents: protectedProcedure.query(async ({ ctx }) => {
    // This combines the existing idle production logic with event generation
    // Called every 30 seconds by the frontend
    
    // First, process normal idle production (same as getProductionSummary)
    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        provinces: {
          include: {
            buildings: true,
            governor: true,
            stocks: true,
            events: {
              where: { resolved: false },
              take: 1 // Just check if any exist
            }
          }
        },
        researchedTechnologies: true,
      }
    });

    if (!city) {
      throw new Error("City not found");
    }

    // Check if any province is eligible for events and randomly trigger event generation
    let eventGenerationTriggered = false;
    const now = Date.now();
    
    // Only run event scheduler occasionally (every ~10-15 minutes on average)
    if (Math.random() < 0.05) { // 5% chance per call = ~90 seconds average with 30s calls
      try {
        const schedulerResult = await runEventScheduler(ctx.prisma);
        if (schedulerResult.eventsGenerated > 0) {
          eventGenerationTriggered = true;
          console.log(`🎲 Auto-generated ${schedulerResult.eventsGenerated} events`);
        }
      } catch (error) {
        console.error("Event scheduler error:", error);
      }
    }

    // Calculate production summary (reuse existing logic)
    let totalHourlyRate: Record<ResourceType, number> = {
      GOLD: 0,
      FOOD: 0,
      STONE: 0,
      IRON: 0,
      POP: 0,
      INFLUENCE: 0,
    };

    let totalResources: Record<ResourceType, number> = {
      GOLD: 0,
      FOOD: 0,
      STONE: 0,
      IRON: 0,
      POP: 0,
      INFLUENCE: 0,
    };

    // Get researched technologies for this city
    const researchedTechs = city.researchedTechnologies.map(tech => tech.techKey);

    city.provinces.forEach((province) => {
      const production = calculateIdleProduction(
        province.buildings,
        province.governor?.personality || null,
        province.lastProduction,
        researchedTechs
      );

      Object.entries(production.hourlyRate).forEach(([resource, rate]) => {
        const resourceType = resource as ResourceType;
        totalHourlyRate[resourceType] += rate;
      });

      province.stocks.forEach((stock) => {
        totalResources[stock.type as ResourceType] += stock.amount;
      });
    });

    // Update player season stats
    const seasonManager = new SeasonManager(ctx.prisma);
    const totalPower = BigInt(
      Object.values(totalResources).reduce((sum, amount) => sum + amount, 0) +
      city.provinces.reduce((sum, p) => sum + p.buildings.length * 100, 0) // Simple power calculation
    );
    
    const totalTechnologies = city.provinces.reduce((sum, p) => {
      // Get user's researched technologies count from current season
      return sum;
    }, 0);

    try {
      await seasonManager.updatePlayerStats(ctx.userId, {
        totalPower,
        resourcesEarned: totalResources,
        buildingsBuilt: city.provinces.reduce((sum, p) => sum + p.buildings.length, 0),
      });
    } catch (error) {
      // Don't fail the main request if season stats fail
      console.warn("Failed to update season stats:", error);
    }

    return {
      resources: totalResources,
      productionRates: totalHourlyRate,
      provinceCount: city.provinces.length,
      governorCount: city.provinces.filter((p) => p.governor).length,
      activeEventCount: city.provinces.reduce((sum, p) => sum + p.events.length, 0),
      eventGenerationTriggered,
    };
  }),
});