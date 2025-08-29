import type { PrismaClient } from "@prisma/client";

// Helper function to automatically update quest progress based on game actions
export async function updateQuestProgress(
  prisma: PrismaClient,
  userId: string,
  action: "BUILD_BUILDING" | "COLLECT_RESOURCE" | "REACH_LEVEL" | "RESEARCH_TECH" | "COMPLETE_CONSTRUCTION",
  params: {
    target?: string;
    amount?: number;
    level?: number;
  }
) {
  try {
    // Find all active player quests
    const playerQuests = await prisma.playerQuest.findMany({
      where: {
        userId: userId,
        status: { in: ["AVAILABLE", "IN_PROGRESS"] },
      },
      include: { quest: true },
    });

    // Filter quests that match this action type
    const relevantQuests = playerQuests.filter(pq => {
      const objectives = pq.quest.objectives as any;
      return objectives && objectives.type === action;
    });

    const updatedQuests = [];

    for (const playerQuest of relevantQuests) {
      const objectives = playerQuest.quest.objectives as any;
      const currentProgress = playerQuest.progress as any;

      // Check if this action matches the quest objective conditions
      const shouldProcess = 
        !objectives.target || // No target specified = matches any
        objectives.target === params.target || // Exact match
        objectives.target === "ANY"; // ANY target matches all

      if (shouldProcess) {
        let shouldComplete = false;
        let newProgress = { ...currentProgress };

        switch (action) {
          case "BUILD_BUILDING":
            newProgress.currentAmount = (newProgress.currentAmount || 0) + (params.amount || 1);
            shouldComplete = newProgress.currentAmount >= (objectives.amount || 1);
            break;
          
          case "REACH_LEVEL":
            if (params.level) {
              newProgress.currentLevel = Math.max(newProgress.currentLevel || 0, params.level);
              shouldComplete = newProgress.currentLevel >= (objectives.level || 1);
            }
            break;

          case "RESEARCH_TECH":
            newProgress.currentAmount = (newProgress.currentAmount || 0) + 1;
            shouldComplete = newProgress.currentAmount >= (objectives.amount || 1);
            break;

          case "COLLECT_RESOURCE":
            newProgress.currentAmount = (newProgress.currentAmount || 0) + (params.amount || 0);
            shouldComplete = newProgress.currentAmount >= (objectives.amount || 1);
            break;
        }

        // Update quest progress
        const updatedPlayerQuest = await prisma.playerQuest.update({
          where: { id: playerQuest.id },
          data: {
            progress: newProgress,
            status: shouldComplete ? "COMPLETED" : "IN_PROGRESS",
            completedAt: shouldComplete ? new Date() : null,
            lastUpdated: new Date(),
          },
          include: { quest: true },
        });

        updatedQuests.push(updatedPlayerQuest);

        // If quest is completed, check if any new quests should be unlocked
        if (shouldComplete) {
          await unlockPrerequisiteQuests(prisma, userId, playerQuest.quest.key);
        }
      }
    }

    return updatedQuests;
  } catch (error) {
    console.error("Failed to update quest progress:", error);
    return [];
  }
}

// Helper function to unlock quests when prerequisites are met
async function unlockPrerequisiteQuests(prisma: PrismaClient, userId: string, completedQuestKey: string) {
  // Find quests that have this quest as a prerequisite
  const questsToUnlock = await prisma.playerQuest.findMany({
    where: {
      userId: userId,
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
    
    const completedPrereqs = await prisma.playerQuest.count({
      where: {
        userId: userId,
        status: { in: ["COMPLETED", "CLAIMED"] },
        quest: {
          key: { in: prerequisites },
        },
      },
    });

    // If all prerequisites are completed, unlock the quest
    if (completedPrereqs === prerequisites.length) {
      await prisma.playerQuest.update({
        where: { id: playerQuest.id },
        data: {
          status: "AVAILABLE",
          startedAt: new Date(),
        },
      });
    }
  }
}

// Helper function to process completed construction/research tasks and update quests
export async function processCompletedTasks(prisma: PrismaClient, userId: string) {
  const currentTime = new Date();
  
  // Process completed construction tasks
  const completedConstructions = await prisma.constructionTask.findMany({
    where: {
      province: { city: { userId } },
      status: "PENDING",
      finishesAt: { lte: currentTime },
    },
    include: { province: true },
  });

  for (const construction of completedConstructions) {
    // Complete the construction
    await prisma.constructionTask.update({
      where: { id: construction.id },
      data: { status: "COMPLETED" },
    });

    // Update or create building
    const existingBuilding = await prisma.buildingInstance.findFirst({
      where: {
        provinceId: construction.provinceId,
        type: construction.buildingType,
      },
    });

    if (existingBuilding) {
      await prisma.buildingInstance.update({
        where: { id: existingBuilding.id },
        data: { level: construction.targetLevel },
      });
    } else {
      await prisma.buildingInstance.create({
        data: {
          provinceId: construction.provinceId,
          type: construction.buildingType,
          level: construction.targetLevel,
        },
      });
    }

    // Update quest progress for building completion
    if (construction.targetLevel === 1) {
      // First time building - trigger BUILD_BUILDING quest
      await updateQuestProgress(prisma, userId, "BUILD_BUILDING", {
        target: construction.buildingType,
        amount: 1,
      });
    }

    // Always trigger REACH_LEVEL quest for building upgrades
    await updateQuestProgress(prisma, userId, "REACH_LEVEL", {
      target: construction.buildingType,
      level: construction.targetLevel,
    });
  }

  // Process completed research tasks
  const completedResearches = await prisma.researchTask.findMany({
    where: {
      city: { userId },
      status: "PENDING",
      finishesAt: { lte: currentTime },
    },
    include: { city: true },
  });

  for (const research of completedResearches) {
    // Complete the research
    await prisma.researchTask.update({
      where: { id: research.id },
      data: { status: "COMPLETED" },
    });

    // Add researched technology
    // Get the current active season
    const activeSeason = await prisma.season.findFirst({
      where: { status: "ACTIVE" },
    });

    await prisma.researchedTechnology.create({
      data: {
        cityId: research.cityId,
        techKey: research.techKey,
        researchedAt: new Date(),
        seasonId: activeSeason?.id, // Use active season or undefined if no season
      },
    });

    // Update quest progress for research completion
    await updateQuestProgress(prisma, userId, "RESEARCH_TECH", {
      target: research.techKey,
      amount: 1,
    });
  }

  return {
    completedConstructions: completedConstructions.length,
    completedResearches: completedResearches.length,
  };
}

// Function to track resource collection for quests
export async function trackResourceCollection(
  prisma: PrismaClient,
  userId: string,
  resourceGains: Record<string, number>
) {
  // Update quests that track resource collection
  for (const [resourceType, amount] of Object.entries(resourceGains)) {
    if (amount > 0) {
      await updateQuestProgress(prisma, userId, "COLLECT_RESOURCE", {
        target: resourceType.toUpperCase(),
        amount,
      });
    }
  }
}