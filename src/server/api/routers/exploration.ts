import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { 
  generateRandomTerritory, 
  calculateExplorationSuccessChance,
  generateGovernorCandidates,
  type Territory 
} from "@/lib/exploration-service";

export const explorationRouter = createTRPCRouter({
  // Get available territories to explore
  getAvailableTerritories: protectedProcedure.query(async ({ ctx }) => {
    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        provinces: {
          include: {
            stocks: true,
          },
        },
      },
    });

    if (!city) throw new TRPCError({ code: "NOT_FOUND", message: "City not found" });

    // Calculate total empire resources
    const totalResources: Record<string, number> = {};
    city.provinces.forEach((province) => {
      province.stocks.forEach((stock) => {
        const resource = stock.type.toLowerCase();
        totalResources[resource] = (totalResources[resource] || 0) + stock.amount;
      });
    });

    // Generate 3-5 random territories to explore
    const numTerritories = Math.floor(Math.random() * 3) + 3; // 3-5 territories
    const territories = Array.from({ length: numTerritories }, () => {
      const territory = generateRandomTerritory();
      const explorationData = calculateExplorationSuccessChance(totalResources, territory);
      
      return {
        ...territory,
        ...explorationData,
      };
    });

    return {
      territories,
      empireResources: totalResources,
      provinceCount: city.provinces.length,
    };
  }),

  // Start exploration of a territory
  exploreTerritory: protectedProcedure
    .input(z.object({
      territoryData: z.object({
        name: z.string(),
        type: z.string(),
        difficulty: z.number(),
        explorationCost: z.record(z.number()),
        colonizationCost: z.record(z.number()),
        resources: z.object({
          goldMultiplier: z.number(),
          foodMultiplier: z.number(),
          stoneMultiplier: z.number(),
          ironMultiplier: z.number(),
          influenceMultiplier: z.number(),
          populationCapacity: z.number(),
        }),
        specialFeatures: z.array(z.string()),
        description: z.string(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const city = await ctx.prisma.city.findUnique({
        where: { userId: ctx.userId },
        include: {
          provinces: {
            include: {
              stocks: true,
            },
          },
        },
      });

      if (!city) throw new TRPCError({ code: "NOT_FOUND", message: "City not found" });

      // Calculate total empire resources
      const totalResources: Record<string, number> = {};
      city.provinces.forEach((province) => {
        province.stocks.forEach((stock) => {
          const resource = stock.type.toLowerCase();
          totalResources[resource] = (totalResources[resource] || 0) + stock.amount;
        });
      });

      // Check if can afford exploration
      const { canAfford, successChance, missingResources } = calculateExplorationSuccessChance(
        totalResources, 
        input.territoryData as Territory
      );

      if (!canAfford) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `Insufficient resources: ${missingResources.map(r => `${r.resource}: need ${r.needed}, have ${r.have}`).join(', ')}` 
        });
      }

      // Deduct exploration costs
      for (const [resource, cost] of Object.entries(input.territoryData.explorationCost)) {
        let remaining = cost;
        const resourceType = resource.toUpperCase() as any;
        
        for (const province of city.provinces) {
          if (remaining <= 0) break;
          
          const stock = province.stocks.find((s) => s.type === resourceType);
          if (stock && stock.amount > 0) {
            const deduction = Math.min(remaining, stock.amount);
            await ctx.prisma.resourceStock.update({
              where: { id: stock.id },
              data: { amount: stock.amount - deduction },
            });
            remaining -= deduction;
          }
        }
      }

      // Determine exploration success
      const isSuccess = Math.random() < successChance;
      
      if (isSuccess) {
        // Successful exploration - territory becomes available for colonization
        return {
          success: true,
          message: `Successfully explored ${input.territoryData.name}! Territory is now available for colonization.`,
          territory: {
            ...input.territoryData,
            canColonize: true,
          },
          governorCandidates: generateGovernorCandidates(),
        };
      } else {
        // Failed exploration - resources lost but no territory gained
        return {
          success: false,
          message: `Exploration of ${input.territoryData.name} failed. Your expedition encountered unexpected difficulties and had to turn back.`,
          territory: null,
          governorCandidates: [],
        };
      }
    }),

  // Colonize an explored territory
  colonizeTerritory: protectedProcedure
    .input(z.object({
      territoryData: z.object({
        name: z.string(),
        type: z.string(),
        difficulty: z.number(),
        colonizationCost: z.record(z.number()),
        resources: z.object({
          goldMultiplier: z.number(),
          foodMultiplier: z.number(),
          stoneMultiplier: z.number(),
          ironMultiplier: z.number(),
          influenceMultiplier: z.number(),
          populationCapacity: z.number(),
        }),
        specialFeatures: z.array(z.string()),
        description: z.string(),
      }),
      selectedGovernor: z.object({
        name: z.string(),
        personality: z.enum(['CONSERVATIVE', 'AGGRESSIVE', 'MERCHANT', 'EXPLORER']),
        initialLoyalty: z.number(),
        initialXP: z.number(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const city = await ctx.prisma.city.findUnique({
        where: { userId: ctx.userId },
        include: {
          provinces: {
            include: {
              stocks: true,
            },
          },
        },
      });

      if (!city) throw new TRPCError({ code: "NOT_FOUND", message: "City not found" });

      // Calculate total empire resources
      const totalResources: Record<string, number> = {};
      city.provinces.forEach((province) => {
        province.stocks.forEach((stock) => {
          const resource = stock.type.toLowerCase();
          totalResources[resource] = (totalResources[resource] || 0) + stock.amount;
        });
      });

      // Check if can afford colonization
      const missingResources: string[] = [];
      for (const [resource, cost] of Object.entries(input.territoryData.colonizationCost)) {
        const available = totalResources[resource.toLowerCase()] || 0;
        if (available < cost) {
          missingResources.push(`${resource}: need ${cost}, have ${available}`);
        }
      }

      if (missingResources.length > 0) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `Insufficient resources: ${missingResources.join(', ')}` 
        });
      }

      // Deduct colonization costs
      for (const [resource, cost] of Object.entries(input.territoryData.colonizationCost)) {
        let remaining = cost;
        const resourceType = resource.toUpperCase() as any;
        
        for (const province of city.provinces) {
          if (remaining <= 0) break;
          
          const stock = province.stocks.find((s) => s.type === resourceType);
          if (stock && stock.amount > 0) {
            const deduction = Math.min(remaining, stock.amount);
            await ctx.prisma.resourceStock.update({
              where: { id: stock.id },
              data: { amount: stock.amount - deduction },
            });
            remaining -= deduction;
          }
        }
      }

      // Create new province
      const newProvince = await ctx.prisma.province.create({
        data: {
          cityId: city.id,
          name: input.territoryData.name,
          // Store territory data as JSON in a metadata field (we'll need to add this to schema)
        },
      });

      // Initialize province resources based on territory type
      const resourceTypes = ['GOLD', 'FOOD', 'STONE', 'IRON', 'POP', 'INFLUENCE'] as const;
      const baseAmounts = {
        GOLD: 300,
        FOOD: 200, 
        STONE: 150,
        IRON: 100,
        POP: 50,
        INFLUENCE: 20,
      };

      for (const resourceType of resourceTypes) {
        const multiplierKey = `${resourceType.toLowerCase()}Multiplier` as keyof typeof input.territoryData.resources;
        const baseAmount = baseAmounts[resourceType];
        const multiplier = resourceType === 'POP' ? 1 : input.territoryData.resources[multiplierKey] || 1;
        
        await ctx.prisma.resourceStock.create({
          data: {
            provinceId: newProvince.id,
            type: resourceType,
            amount: Math.floor(baseAmount * multiplier),
          },
        });
      }

      // Create and assign governor
      const governor = await ctx.prisma.governor.create({
        data: {
          provinceId: newProvince.id,
          name: input.selectedGovernor.name,
          personality: input.selectedGovernor.personality,
          loyalty: input.selectedGovernor.initialLoyalty,
          xp: input.selectedGovernor.initialXP,
        },
      });

      return {
        success: true,
        message: `Successfully colonized ${input.territoryData.name}! ${input.selectedGovernor.name} has been appointed as governor.`,
        newProvince: {
          id: newProvince.id,
          name: newProvince.name,
          governor: governor,
          territoryType: input.territoryData.type,
          features: input.territoryData.specialFeatures,
        },
      };
    }),

  // Get exploration statistics for the empire
  getExplorationStats: protectedProcedure.query(async ({ ctx }) => {
    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        provinces: {
          include: {
            governor: true,
            buildings: true,
          },
        },
      },
    });

    if (!city) throw new TRPCError({ code: "NOT_FOUND", message: "City not found" });

    return {
      totalProvinces: city.provinces.length,
      governedProvinces: city.provinces.filter(p => p.governor).length,
      totalBuildings: city.provinces.reduce((sum, p) => sum + p.buildings.length, 0),
      averageBuildingLevel: city.provinces.length > 0 ? 
        city.provinces.reduce((sum, p) => 
          sum + (p.buildings.length > 0 ? 
            p.buildings.reduce((bSum, b) => bSum + b.level, 0) / p.buildings.length : 0
          ), 0
        ) / city.provinces.length : 0,
    };
  }),
});