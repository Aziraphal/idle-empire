import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { 
  calculateTechnologyBonuses,
  getAvailableTechnologies,
  calculateResearchCost,
  getTechnologyTree
} from "@/lib/technology-effects";
import { TECHNOLOGY_DATA } from "@/lib/timer-service";
import { SeasonManager } from "@/lib/season-manager";
import { updateQuestProgress } from "@/lib/quest-progress-tracker";

export const technologiesRouter = createTRPCRouter({
  // Get all researched technologies for current user in current season
  getResearchedTechnologies: protectedProcedure.query(async ({ ctx }) => {
    const seasonManager = new SeasonManager(ctx.prisma);
    const currentSeason = await seasonManager.getCurrentSeason();
    
    if (!currentSeason) {
      return {
        technologies: [],
        techKeys: [],
        totalBonuses: calculateTechnologyBonuses([]),
      };
    }

    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        researchedTechnologies: {
          where: {
            seasonId: currentSeason.id,
          },
          orderBy: { researchedAt: "asc" },
        },
      },
    });

    if (!city) {
      throw new Error("City not found");
    }

    const researchedTechKeys = city.researchedTechnologies.map(tech => tech.techKey);
    const bonuses = calculateTechnologyBonuses(researchedTechKeys);

    return {
      technologies: city.researchedTechnologies,
      techKeys: researchedTechKeys,
      totalBonuses: bonuses,
    };
  }),

  // Get available technologies that can be researched in current season
  getAvailableTechnologies: protectedProcedure.query(async ({ ctx }) => {
    const seasonManager = new SeasonManager(ctx.prisma);
    const currentSeason = await seasonManager.getCurrentSeason();
    
    if (!currentSeason) {
      return [];
    }

    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        researchedTechnologies: {
          where: {
            seasonId: currentSeason.id,
          },
        },
      },
    });

    if (!city) {
      throw new Error("City not found");
    }

    const researchedTechKeys = city.researchedTechnologies.map(tech => tech.techKey);
    const available = getAvailableTechnologies(researchedTechKeys);
    
    // Filter by technologies available in current season
    const seasonTechs = await seasonManager.getSeasonTechnologies(currentSeason.id);
    const availableInSeason = available.filter(({ key }) => seasonTechs.includes(key));

    return availableInSeason.map(({ key, tech }) => ({
      techKey: key,
      ...tech,
      cost: calculateResearchCost(key, calculateTechnologyBonuses(researchedTechKeys)),
    }));
  }),

  // Get full technology tree for visualization
  getTechnologyTree: protectedProcedure.query(async ({ ctx }) => {
    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        researchedTechnologies: true,
      },
    });

    if (!city) {
      throw new Error("City not found");
    }

    const researchedTechKeys = city.researchedTechnologies.map(tech => tech.techKey);
    const tree = getTechnologyTree();
    const bonuses = calculateTechnologyBonuses(researchedTechKeys);
    const availableKeys = getAvailableTechnologies(researchedTechKeys).map(t => t.key);

    // Enhance tree with research status and costs
    const enhancedTree = tree.map(tierGroup => ({
      ...tierGroup,
      technologies: tierGroup.technologies.map(tech => ({
        ...tech,
        isResearched: researchedTechKeys.includes(tech.key),
        isAvailable: availableKeys.includes(tech.key),
        cost: calculateResearchCost(tech.key, bonuses),
      }))
    }));

    return {
      tree: enhancedTree,
      researchedCount: researchedTechKeys.length,
      totalBonuses: bonuses,
    };
  }),

  // Start researching a technology
  startResearch: protectedProcedure
    .input(z.object({
      techKey: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const seasonManager = new SeasonManager(ctx.prisma);
      const currentSeason = await seasonManager.getCurrentSeason();
      
      if (!currentSeason) {
        throw new Error("No active season");
      }

      // Check if technology is available in current season
      const seasonTechs = await seasonManager.getSeasonTechnologies(currentSeason.id);
      if (!seasonTechs.includes(input.techKey)) {
        throw new Error("Technology not available in current season");
      }

      const city = await ctx.prisma.city.findUnique({
        where: { userId: ctx.userId },
        include: {
          researchedTechnologies: {
            where: {
              seasonId: currentSeason.id,
            },
          },
          researches: {
            where: { status: "PENDING" },
          },
          provinces: {
            include: {
              stocks: true,
            },
          },
        },
      });

      if (!city) {
        throw new Error("City not found");
      }

      // Check if already researched in this season
      if (city.researchedTechnologies.some(tech => tech.techKey === input.techKey)) {
        throw new Error("Technology already researched this season");
      }

      // Check if already researching
      if (city.researches.some(research => research.techKey === input.techKey)) {
        throw new Error("Already researching this technology");
      }

      // Check prerequisites and availability
      const researchedTechKeys = city.researchedTechnologies.map(tech => tech.techKey);
      const available = getAvailableTechnologies(researchedTechKeys);
      const techToResearch = available.find(t => t.key === input.techKey);

      if (!techToResearch) {
        throw new Error("Technology not available or prerequisites not met");
      }

      // Calculate costs
      const bonuses = calculateTechnologyBonuses(researchedTechKeys);
      const { cost, timeHours } = calculateResearchCost(input.techKey, bonuses);

      // Check if player has enough resources
      const totalResources = city.provinces.reduce((total, province) => {
        province.stocks.forEach(stock => {
          const resourceKey = stock.type.toLowerCase();
          total[resourceKey] = (total[resourceKey] || 0) + stock.amount;
        });
        return total;
      }, {} as Record<string, number>);

      // Verify player has sufficient resources
      for (const [resource, amount] of Object.entries(cost)) {
        const available = totalResources[resource] || 0;
        if (available < amount) {
          throw new Error(`Insufficient ${resource}: need ${amount}, have ${available}`);
        }
      }

      // Deduct resources (distribute from provinces proportionally)
      const deductionPromises = Object.entries(cost).map(async ([resource, amount]) => {
        let remaining = amount;
        
        for (const province of city.provinces) {
          if (remaining <= 0) break;
          
          const stock = province.stocks.find(s => s.type.toLowerCase() === resource);
          if (stock && stock.amount > 0) {
            const deduction = Math.min(stock.amount, remaining);
            
            await ctx.prisma.resourceStock.update({
              where: { id: stock.id },
              data: { amount: stock.amount - deduction },
            });
            
            remaining -= deduction;
          }
        }
      });

      await Promise.all(deductionPromises);

      // Start research
      const finishTime = new Date();
      finishTime.setTime(finishTime.getTime() + timeHours * 60 * 60 * 1000);

      const research = await ctx.prisma.researchTask.create({
        data: {
          cityId: city.id,
          techKey: input.techKey,
          finishesAt: finishTime,
        },
      });

      return {
        research,
        costPaid: cost,
        completionTime: finishTime,
      };
    }),

  // Complete a finished research
  completeResearch: protectedProcedure
    .input(z.object({
      researchId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const research = await ctx.prisma.researchTask.findUnique({
        where: { id: input.researchId },
        include: {
          city: true,
        },
      });

      if (!research || research.city.userId !== ctx.userId) {
        throw new Error("Research not found or not owned by user");
      }

      if (research.status !== "PENDING") {
        throw new Error("Research is not pending");
      }

      if (research.finishesAt > new Date()) {
        throw new Error("Research not yet complete");
      }

      // Mark research as complete
      await ctx.prisma.researchTask.update({
        where: { id: input.researchId },
        data: { status: "DONE" },
      });

      // Add technology to researched list for current season
      const seasonManager = new SeasonManager(ctx.prisma);
      const currentSeason = await seasonManager.getCurrentSeason();
      
      if (!currentSeason) {
        throw new Error("No active season");
      }

      const researchedTech = await ctx.prisma.researchedTechnology.create({
        data: {
          cityId: research.cityId,
          techKey: research.techKey,
          seasonId: currentSeason.id,
        },
      });

      // Get technology data for response
      const techData = TECHNOLOGY_DATA[research.techKey];

      // Update quest progress for research completion
      await updateQuestProgress(ctx.prisma, ctx.userId, "RESEARCH_TECH", {
        target: research.techKey,
        amount: 1,
      });

      return {
        technology: researchedTech,
        techData,
        message: `Research completed: ${techData?.name || research.techKey}!`,
      };
    }),

  // Get active research projects
  getActiveResearch: protectedProcedure.query(async ({ ctx }) => {
    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        researches: {
          where: { status: "PENDING" },
          orderBy: { finishesAt: "asc" },
        },
      },
    });

    if (!city) {
      throw new Error("City not found");
    }

    // Calculate remaining time and add tech data
    const activeResearch = city.researches.map(research => {
      const techData = TECHNOLOGY_DATA[research.techKey];
      const now = new Date();
      const remainingMs = Math.max(0, research.finishesAt.getTime() - now.getTime());
      
      return {
        ...research,
        techData,
        remainingMs,
        isComplete: remainingMs === 0,
        remainingHours: Math.floor(remainingMs / (1000 * 60 * 60)),
        remainingMinutes: Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60)),
      };
    });

    return activeResearch;
  }),
});