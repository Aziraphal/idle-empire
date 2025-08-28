import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { 
  makeGovernorDecision, 
  generateGovernorReport, 
  updateGovernorExperience,
  type ProvinceState,
  type EmpireState 
} from "@/lib/governor-ai";
import { getBuildingUpgradeCost, TECHNOLOGY_DATA } from "@/lib/timer-service";

export const governorsRouter = createTRPCRouter({
  // Get all governors and their current status
  getGovernors: protectedProcedure.query(async ({ ctx }) => {
    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        provinces: {
          include: {
            governor: true,
            buildings: true,
            stocks: true,
            constructions: {
              where: { status: "PENDING" },
            },
          },
        },
        researches: {
          where: { status: "PENDING" },
        },
      },
    });

    if (!city) throw new TRPCError({ code: "NOT_FOUND", message: "City not found" });

    return {
      provinces: city.provinces.map((province) => ({
        id: province.id,
        name: province.name,
        governor: province.governor ? {
          id: province.governor.id,
          name: province.governor.name,
          personality: province.governor.personality,
          loyalty: province.governor.loyalty,
          xp: province.governor.xp,
        } : null,
        buildings: province.buildings,
        constructions: province.constructions,
        resources: province.stocks.reduce((acc, stock) => {
          acc[stock.type.toLowerCase()] = stock.amount;
          return acc;
        }, {} as Record<string, number>),
      })),
      activeResearches: city.researches,
    };
  }),

  // Execute AI decisions for all governors
  executeAIDecisions: protectedProcedure.mutation(async ({ ctx }) => {
    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        provinces: {
          include: {
            governor: true,
            buildings: true,
            stocks: true,
            constructions: {
              where: { status: "PENDING" },
            },
          },
        },
        researches: {
          where: { status: "PENDING" },
        },
      },
    });

    if (!city) throw new TRPCError({ code: "NOT_FOUND", message: "City not found" });

    // Prepare empire state
    const totalResources: Record<string, number> = {};
    city.provinces.forEach((province) => {
      province.stocks.forEach((stock) => {
        const resource = stock.type.toLowerCase();
        totalResources[resource] = (totalResources[resource] || 0) + stock.amount;
      });
    });

    const empireState: EmpireState = {
      provinces: city.provinces.map((province) => ({
        id: province.id,
        name: province.name,
        resources: province.stocks.reduce((acc, stock) => {
          acc[stock.type.toLowerCase()] = stock.amount;
          return acc;
        }, {} as Record<string, number>),
        buildings: province.buildings,
        activeConstructions: province.constructions,
        governor: province.governor ? {
          name: province.governor.name,
          personality: province.governor.personality,
          loyalty: province.governor.loyalty,
          xp: province.governor.xp,
        } : {
          name: "No Governor",
          personality: "CONSERVATIVE" as any,
          loyalty: 0,
          xp: 0,
        },
      })),
      activeResearches: city.researches,
      totalResources,
    };

    const decisions = [];
    const reports = [];

    // Process each province with a governor
    for (const province of city.provinces) {
      if (!province.governor) continue;

      const provinceState: ProvinceState = {
        id: province.id,
        name: province.name,
        resources: province.stocks.reduce((acc, stock) => {
          acc[stock.type.toLowerCase()] = stock.amount;
          return acc;
        }, {} as Record<string, number>),
        buildings: province.buildings,
        activeConstructions: province.constructions,
        governor: {
          name: province.governor.name,
          personality: province.governor.personality,
          loyalty: province.governor.loyalty,
          xp: province.governor.xp,
        },
      };

      // Make AI decision
      const decision = makeGovernorDecision(provinceState, empireState);
      
      if (decision.type !== 'WAIT' && decision.action) {
        try {
          if (decision.type === 'BUILD' && decision.action.buildingType) {
            // Execute building construction
            const currentLevel = province.buildings.find(b => b.type === decision.action!.buildingType)?.level || 0;
            const { cost, time } = getBuildingUpgradeCost(decision.action.buildingType, currentLevel);
            
            // Check if can afford
            const canAfford = Object.entries(cost).every(([resource, amount]) => {
              const available = provinceState.resources[resource] || 0;
              return available >= amount;
            });

            if (canAfford) {
              // Deduct resources
              for (const [resource, amount] of Object.entries(cost)) {
                const resourceType = resource.toUpperCase() as any;
                await ctx.prisma.resourceStock.updateMany({
                  where: {
                    provinceId: province.id,
                    type: resourceType,
                  },
                  data: {
                    amount: { decrement: amount },
                  },
                });
              }

              // Create construction task
              const finishTime = new Date(Date.now() + time * 60 * 60 * 1000);
              await ctx.prisma.constructionTask.create({
                data: {
                  provinceId: province.id,
                  buildingType: decision.action.buildingType,
                  targetLevel: currentLevel + 1,
                  finishesAt: finishTime,
                  status: "PENDING",
                },
              });

              // Update governor XP
              const newXP = updateGovernorExperience(province.governor, decision);
              await ctx.prisma.governor.update({
                where: { id: province.governor.id },
                data: { xp: newXP },
              });

              decisions.push({
                governorName: province.governor.name,
                provinceName: province.name,
                action: `Started building ${decision.action.buildingType.toLowerCase()} level ${currentLevel + 1}`,
                reason: decision.action.reason,
              });
            }
          } else if (decision.type === 'RESEARCH' && decision.action.techKey) {
            // Execute research (only one governor can start research)
            const tech = TECHNOLOGY_DATA[decision.action.techKey];
            if (tech) {
              // Check if can afford (using total empire resources)
              const canAfford = Object.entries(tech.cost).every(([resource, amount]) => {
                const available = totalResources[resource] || 0;
                return available >= amount;
              });

              if (canAfford) {
                // Deduct resources from provinces
                for (const [resource, amount] of Object.entries(tech.cost)) {
                  let remaining = amount;
                  const resourceType = resource.toUpperCase() as any;
                  
                  for (const prov of city.provinces) {
                    if (remaining <= 0) break;
                    
                    const stock = prov.stocks.find((s) => s.type === resourceType);
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

                // Create research task
                const finishTime = new Date(Date.now() + tech.researchTime * 60 * 60 * 1000);
                await ctx.prisma.researchTask.create({
                  data: {
                    cityId: city.id,
                    techKey: decision.action.techKey,
                    finishesAt: finishTime,
                    status: "PENDING",
                  },
                });

                // Update governor XP
                const newXP = updateGovernorExperience(province.governor, decision);
                await ctx.prisma.governor.update({
                  where: { id: province.governor.id },
                  data: { xp: newXP },
                });

                decisions.push({
                  governorName: province.governor.name,
                  provinceName: province.name,
                  action: `Started research: ${tech.name}`,
                  reason: decision.action.reason,
                });
              }
            }
          }
        } catch (error) {
          console.error(`Governor AI decision failed for ${province.governor.name}:`, error);
        }
      }

      // Generate governor report
      const report = generateGovernorReport(provinceState, [decision]);
      reports.push({
        governorName: province.governor.name,
        provinceName: province.name,
        report,
      });
    }

    return {
      decisions,
      reports,
      totalDecisions: decisions.length,
    };
  }),

  // Manually trigger AI decision for a specific governor
  triggerGovernorDecision: protectedProcedure
    .input(z.object({
      provinceId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const province = await ctx.prisma.province.findUnique({
        where: { id: input.provinceId },
        include: {
          city: true,
          governor: true,
          buildings: true,
          stocks: true,
          constructions: {
            where: { status: "PENDING" },
          },
        },
      });

      if (!province || province.city.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Province not found" });
      }

      if (!province.governor) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Province has no governor" });
      }

      // Get empire state for context
      const city = await ctx.prisma.city.findUnique({
        where: { id: province.cityId },
        include: {
          provinces: {
            include: {
              stocks: true,
              buildings: true,
              constructions: { where: { status: "PENDING" } },
            },
          },
          researches: { where: { status: "PENDING" } },
        },
      });

      if (!city) throw new TRPCError({ code: "NOT_FOUND", message: "City not found" });

      const totalResources: Record<string, number> = {};
      city.provinces.forEach((prov) => {
        prov.stocks.forEach((stock) => {
          const resource = stock.type.toLowerCase();
          totalResources[resource] = (totalResources[resource] || 0) + stock.amount;
        });
      });

      const empireState: EmpireState = {
        provinces: city.provinces.map((prov) => ({
          id: prov.id,
          name: prov.name,
          resources: prov.stocks.reduce((acc, stock) => {
            acc[stock.type.toLowerCase()] = stock.amount;
            return acc;
          }, {} as Record<string, number>),
          buildings: prov.buildings,
          activeConstructions: prov.constructions,
          governor: province.governor ? {
            name: province.governor.name,
            personality: province.governor.personality,
            loyalty: province.governor.loyalty,
            xp: province.governor.xp,
          } : {
            name: "No Governor",
            personality: "CONSERVATIVE" as any,
            loyalty: 0,
            xp: 0,
          },
        })),
        activeResearches: city.researches,
        totalResources,
      };

      const provinceState: ProvinceState = {
        id: province.id,
        name: province.name,
        resources: province.stocks.reduce((acc, stock) => {
          acc[stock.type.toLowerCase()] = stock.amount;
          return acc;
        }, {} as Record<string, number>),
        buildings: province.buildings,
        activeConstructions: province.constructions,
        governor: {
          name: province.governor.name,
          personality: province.governor.personality,
          loyalty: province.governor.loyalty,
          xp: province.governor.xp,
        },
      };

      const decision = makeGovernorDecision(provinceState, empireState);
      const report = generateGovernorReport(provinceState, [decision]);

      return {
        decision,
        report,
        governorName: province.governor.name,
      };
    }),
});