import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { 
  getBuildingUpgradeCost, 
  isTaskComplete, 
  BUILDING_DATA,
  TECHNOLOGY_DATA 
} from "@/lib/timer-service";
import { updateQuestProgress } from "@/lib/quest-progress-tracker";

export const constructionRouter = createTRPCRouter({
  // Get all construction and research tasks for user
  getTasks: protectedProcedure.query(async ({ ctx }) => {
    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        provinces: {
          include: {
            constructions: {
              where: { status: "PENDING" },
            },
            buildings: true,
          },
        },
        researches: {
          where: { status: "PENDING" },
        },
      },
    });

    if (!city) throw new TRPCError({ code: "NOT_FOUND", message: "City not found" });

    // Process completed tasks
    const currentTime = new Date();
    
    // Check and complete finished constructions
    for (const province of city.provinces) {
      for (const construction of province.constructions) {
        if (isTaskComplete(construction.finishesAt, currentTime)) {
          // Complete the construction
          await ctx.prisma.constructionTask.update({
            where: { id: construction.id },
            data: { status: "DONE" },
          });

          // Update or create building
          const existingBuilding = await ctx.prisma.buildingInstance.findFirst({
            where: {
              provinceId: province.id,
              type: construction.buildingType,
            },
          });

          if (existingBuilding) {
            // Upgrade existing building
            await ctx.prisma.buildingInstance.update({
              where: { id: existingBuilding.id },
              data: { level: construction.targetLevel },
            });
          } else {
            // Create new building
            await ctx.prisma.buildingInstance.create({
              data: {
                provinceId: province.id,
                type: construction.buildingType,
                level: construction.targetLevel,
              },
            });
          }

          // Update quest progress for building completion
          if (construction.targetLevel === 1) {
            // First time building - trigger BUILD_BUILDING quest
            await updateQuestProgress(ctx.prisma, ctx.userId, "BUILD_BUILDING", {
              target: construction.buildingType,
              amount: 1,
            });
          }

          // Always trigger REACH_LEVEL quest for building upgrades
          await updateQuestProgress(ctx.prisma, ctx.userId, "REACH_LEVEL", {
            target: construction.buildingType,
            level: construction.targetLevel,
          });
        }
      }
    }

    // Check and complete finished research
    for (const research of city.researches) {
      if (isTaskComplete(research.finishesAt, currentTime)) {
        await ctx.prisma.researchTask.update({
          where: { id: research.id },
          data: { status: "DONE" },
        });

        // TODO: Apply research effects to empire
        // This could be stored in a separate table or applied as modifiers
      }
    }

    // Re-fetch updated data
    const updatedCity = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        provinces: {
          include: {
            constructions: {
              where: { status: "PENDING" },
            },
            buildings: true,
          },
        },
        researches: {
          where: { status: "PENDING" },
        },
      },
    });

    return updatedCity;
  }),

  // Start building construction or upgrade
  startConstruction: protectedProcedure
    .input(
      z.object({
        provinceId: z.string(),
        buildingType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get province with current buildings and resources
      const province = await ctx.prisma.province.findUnique({
        where: { id: input.provinceId },
        include: {
          city: true,
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

      // Check if there's already a construction in progress for this building type
      const existingConstruction = province.constructions.find(
        (c) => c.buildingType === input.buildingType
      );

      if (existingConstruction) {
        throw new TRPCError({ 
          code: "CONFLICT", 
          message: "Construction already in progress for this building type" 
        });
      }

      // Get current building level
      const existingBuilding = province.buildings.find(
        (b) => b.type === input.buildingType
      );
      const currentLevel = existingBuilding?.level || 0;
      const targetLevel = currentLevel + 1;

      // Calculate cost and time
      const { cost, time } = getBuildingUpgradeCost(input.buildingType, currentLevel);

      // Check if player has enough resources
      const resourceStocks: Record<string, number> = {};
      province.stocks.forEach((stock) => {
        resourceStocks[stock.type.toLowerCase()] = stock.amount;
      });

      for (const [resource, amount] of Object.entries(cost)) {
        const available = resourceStocks[resource] || 0;
        if (available < amount) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: `Not enough ${resource}. Need ${amount}, have ${available}` 
          });
        }
      }

      // Deduct resources
      for (const [resource, amount] of Object.entries(cost)) {
        const resourceType = resource.toUpperCase() as any;
        await ctx.prisma.resourceStock.updateMany({
          where: {
            provinceId: input.provinceId,
            type: resourceType,
          },
          data: {
            amount: {
              decrement: amount,
            },
          },
        });
      }

      // Create construction task
      const finishTime = new Date(Date.now() + time * 60 * 60 * 1000); // Convert hours to ms

      const construction = await ctx.prisma.constructionTask.create({
        data: {
          provinceId: input.provinceId,
          buildingType: input.buildingType,
          targetLevel,
          finishesAt: finishTime,
          status: "PENDING",
        },
      });

      return {
        construction,
        cost,
        timeHours: time,
        targetLevel,
      };
    }),

});