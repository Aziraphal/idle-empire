import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// Quest objective validation schemas
const objectiveSchema = z.object({
  type: z.enum(["BUILD_BUILDING", "COLLECT_RESOURCE", "REACH_LEVEL", "RESEARCH_TECH", "COMPLETE_CONSTRUCTION"]),
  target: z.string(),
  amount: z.number().optional(),
  level: z.number().optional(),
});

const rewardSchema = z.object({
  resources: z.record(z.number()).optional(),
  xp: z.number().optional(),
  title: z.string().optional(),
  cosmetic: z.string().optional(),
});

export const questsRouter = createTRPCRouter({
  // Get all quests available to the player
  getPlayerQuests: protectedProcedure.query(async ({ ctx }) => {
    const playerQuests = await ctx.prisma.playerQuest.findMany({
      where: { userId: ctx.userId },
      include: {
        quest: true,
      },
      orderBy: [
        { quest: { type: "asc" } },
        { quest: { sortOrder: "asc" } },
      ],
    });

    return {
      quests: playerQuests.map((pq) => ({
        id: pq.id,
        questId: pq.questId,
        key: pq.quest.key,
        name: pq.quest.name,
        description: pq.quest.description,
        type: pq.quest.type,
        category: pq.quest.category,
        status: pq.status,
        progress: pq.progress,
        objectives: pq.quest.objectives,
        rewards: pq.quest.rewards,
        startedAt: pq.startedAt,
        completedAt: pq.completedAt,
        claimedAt: pq.claimedAt,
        expiresAt: pq.expiresAt,
      })),
    };
  }),

  // Initialize tutorial quests for new players
  initializeTutorialQuests: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if player already has tutorial quests
    const existingTutorialQuests = await ctx.prisma.playerQuest.findFirst({
      where: {
        userId: ctx.userId,
        quest: { type: "TUTORIAL" },
      },
    });

    if (existingTutorialQuests) {
      throw new TRPCError({
        code: "BAD_REQUEST", 
        message: "Tutorial quests already initialized",
      });
    }

    // Create tutorial quest definitions if they don't exist
    const tutorialQuests = [
      {
        key: "tutorial_first_building",
        name: "Build Your First Farm",
        description: "Construct a farm to start food production and grow your empire.",
        type: "TUTORIAL" as const,
        category: "Building",
        sortOrder: 1,
        prerequisites: [],
        objectives: {
          type: "BUILD_BUILDING",
          target: "FARM",
          amount: 1,
          currentAmount: 0,
        },
        rewards: {
          resources: { gold: 200, food: 100 },
          xp: 50,
        },
      },
      {
        key: "tutorial_upgrade_building",
        name: "Upgrade Your Farm",
        description: "Upgrade your farm to level 2 to increase production.",
        type: "TUTORIAL" as const,
        category: "Building", 
        sortOrder: 2,
        prerequisites: ["tutorial_first_building"],
        objectives: {
          type: "REACH_LEVEL",
          target: "FARM",
          level: 2,
          currentLevel: 0,
        },
        rewards: {
          resources: { gold: 300, stone: 150 },
          xp: 75,
        },
      },
      {
        key: "tutorial_build_mine",
        name: "Construct a Mine",
        description: "Build a mine to start gold and iron production.",
        type: "TUTORIAL" as const,
        category: "Building",
        sortOrder: 3,
        prerequisites: ["tutorial_upgrade_building"],
        objectives: {
          type: "BUILD_BUILDING",
          target: "MINE",
          amount: 1,
          currentAmount: 0,
        },
        rewards: {
          resources: { gold: 400, iron: 100 },
          xp: 100,
        },
      },
      {
        key: "tutorial_first_research",
        name: "Research Your First Technology", 
        description: "Research Agricultural Techniques to boost your farm production.",
        type: "TUTORIAL" as const,
        category: "Research",
        sortOrder: 4,
        prerequisites: ["tutorial_build_mine"],
        objectives: {
          type: "RESEARCH_TECH",
          target: "AGRICULTURE_1",
          amount: 1,
          currentAmount: 0,
        },
        rewards: {
          resources: { gold: 500, influence: 25 },
          xp: 150,
          title: "Scholar",
        },
      },
    ];

    // Create quests in database
    const createdQuests = [];
    for (const questData of tutorialQuests) {
      // Check if quest definition exists
      let quest = await ctx.prisma.quest.findUnique({
        where: { key: questData.key },
      });

      if (!quest) {
        quest = await ctx.prisma.quest.create({
          data: questData,
        });
      }

      // Create player quest instance
      const playerQuest = await ctx.prisma.playerQuest.create({
        data: {
          userId: ctx.userId,
          questId: quest.id,
          status: questData.prerequisites.length === 0 ? "AVAILABLE" : "LOCKED",
          progress: { currentAmount: 0, currentLevel: 0 },
        },
        include: { quest: true },
      });

      createdQuests.push(playerQuest);
    }

    return {
      success: true,
      message: `Initialized ${createdQuests.length} tutorial quests`,
      quests: createdQuests,
    };
  }),

  // Update quest progress (called internally by game actions)
  updateQuestProgress: protectedProcedure
    .input(z.object({
      action: z.enum(["BUILD_BUILDING", "COLLECT_RESOURCE", "REACH_LEVEL", "RESEARCH_TECH", "COMPLETE_CONSTRUCTION"]),
      target: z.string(),
      amount: z.number().optional(),
      level: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Find all active player quests that could be progressed by this action
      const relevantQuests = await ctx.prisma.playerQuest.findMany({
        where: {
          userId: ctx.userId,
          status: { in: ["AVAILABLE", "IN_PROGRESS"] },
          quest: {
            objectives: {
              path: ["type"],
              equals: input.action,
            },
          },
        },
        include: { quest: true },
      });

      const updatedQuests = [];

      for (const playerQuest of relevantQuests) {
        const objectives = playerQuest.quest.objectives as any;
        const currentProgress = playerQuest.progress as any;

        // Check if this action matches the quest objective
        if (objectives.target === input.target) {
          let shouldUpdate = false;
          let newProgress = { ...currentProgress };

          switch (input.action) {
            case "BUILD_BUILDING":
              if (objectives.type === "BUILD_BUILDING") {
                newProgress.currentAmount = (newProgress.currentAmount || 0) + (input.amount || 1);
                shouldUpdate = newProgress.currentAmount >= objectives.amount;
              }
              break;
            
            case "REACH_LEVEL":
              if (objectives.type === "REACH_LEVEL" && input.level) {
                newProgress.currentLevel = Math.max(newProgress.currentLevel || 0, input.level);
                shouldUpdate = newProgress.currentLevel >= objectives.level;
              }
              break;

            case "RESEARCH_TECH":
              if (objectives.type === "RESEARCH_TECH") {
                newProgress.currentAmount = (newProgress.currentAmount || 0) + 1;
                shouldUpdate = newProgress.currentAmount >= (objectives.amount || 1);
              }
              break;

            case "COLLECT_RESOURCE":
              if (objectives.type === "COLLECT_RESOURCE") {
                newProgress.currentAmount = (newProgress.currentAmount || 0) + (input.amount || 0);
                shouldUpdate = newProgress.currentAmount >= objectives.amount;
              }
              break;
          }

          // Update quest progress
          const updatedPlayerQuest = await ctx.prisma.playerQuest.update({
            where: { id: playerQuest.id },
            data: {
              progress: newProgress,
              status: shouldUpdate ? "COMPLETED" : "IN_PROGRESS",
              completedAt: shouldUpdate ? new Date() : null,
              lastUpdated: new Date(),
            },
            include: { quest: true },
          });

          updatedQuests.push(updatedPlayerQuest);

          // If quest is completed, check if any new quests should be unlocked
          if (shouldUpdate) {
            await unlockPrerequisiteQuests(ctx, playerQuest.quest.key);
          }
        }
      }

      return { updatedQuests };
    }),

  // Claim quest rewards
  claimQuestRewards: protectedProcedure
    .input(z.object({
      playerQuestId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const playerQuest = await ctx.prisma.playerQuest.findUnique({
        where: { 
          id: input.playerQuestId,
          userId: ctx.userId,
        },
        include: { quest: true },
      });

      if (!playerQuest) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quest not found" });
      }

      if (playerQuest.status !== "COMPLETED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Quest not completed" });
      }

      if (playerQuest.claimedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Rewards already claimed" });
      }

      const rewards = playerQuest.quest.rewards as any;

      // Get user's city for resource distribution
      const city = await ctx.prisma.city.findUnique({
        where: { userId: ctx.userId },
        include: {
          provinces: {
            include: { stocks: true },
            take: 1, // Just get first province for resources
          },
        },
      });

      if (!city || city.provinces.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "City not found" });
      }

      const province = city.provinces[0];

      // Award resources
      if (rewards.resources) {
        for (const [resourceType, amount] of Object.entries(rewards.resources)) {
          const resourceEnum = resourceType.toUpperCase();
          await ctx.prisma.resourceStock.upsert({
            where: {
              provinceId_type: {
                provinceId: province.id,
                type: resourceEnum as any,
              },
            },
            update: {
              amount: { increment: amount as number },
            },
            create: {
              provinceId: province.id,
              type: resourceEnum as any,
              amount: amount as number,
            },
          });
        }
      }

      // Mark quest as claimed
      await ctx.prisma.playerQuest.update({
        where: { id: playerQuest.id },
        data: {
          status: "CLAIMED",
          claimedAt: new Date(),
        },
      });

      return {
        success: true,
        message: "Quest rewards claimed!",
        rewards,
      };
    }),
});

// Helper function to unlock quests when prerequisites are met
async function unlockPrerequisiteQuests(ctx: any, completedQuestKey: string) {
  // Find quests that have this quest as a prerequisite
  const questsToUnlock = await ctx.prisma.playerQuest.findMany({
    where: {
      userId: ctx.userId,
      status: "LOCKED",
      quest: {
        prerequisites: {
          has: completedQuestKey,
        },
      },
    },
    include: { quest: true },
  });

  for (const playerQuest of questsToUnlock) {
    // Check if all prerequisites are now completed
    const prerequisites = playerQuest.quest.prerequisites as string[];
    
    const completedPrereqs = await ctx.prisma.playerQuest.count({
      where: {
        userId: ctx.userId,
        status: { in: ["COMPLETED", "CLAIMED"] },
        quest: {
          key: { in: prerequisites },
        },
      },
    });

    // If all prerequisites are completed, unlock the quest
    if (completedPrereqs === prerequisites.length) {
      await ctx.prisma.playerQuest.update({
        where: { id: playerQuest.id },
        data: {
          status: "AVAILABLE",
          startedAt: new Date(),
        },
      });
    }
  }
}