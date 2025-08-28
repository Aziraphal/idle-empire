import { PrismaClient, TitleRarity, TitleCategory, BonusType, AchievementCategory } from "@prisma/client";

export class RewardManager {
  constructor(private prisma: PrismaClient) {}

  async grantTitle(userId: string, titleId: string) {
    const existingPlayerTitle = await this.prisma.playerTitle.findUnique({
      where: {
        userId_titleId: {
          userId,
          titleId,
        },
      },
    });

    if (existingPlayerTitle) {
      return existingPlayerTitle;
    }

    const playerTitle = await this.prisma.playerTitle.create({
      data: {
        userId,
        titleId,
        unlockedAt: new Date(),
      },
      include: {
        title: true,
      },
    });

    return playerTitle;
  }

  async grantBonus(userId: string, bonusId: string) {
    const existingPlayerBonus = await this.prisma.playerBonus.findUnique({
      where: {
        userId_bonusId: {
          userId,
          bonusId,
        },
      },
    });

    if (existingPlayerBonus) {
      return existingPlayerBonus;
    }

    const playerBonus = await this.prisma.playerBonus.create({
      data: {
        userId,
        bonusId,
        unlockedAt: new Date(),
      },
      include: {
        bonus: true,
      },
    });

    return playerBonus;
  }

  async grantAchievement(userId: string, achievementId: string) {
    const existingPlayerAchievement = await this.prisma.playerAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId,
        },
      },
    });

    if (existingPlayerAchievement) {
      return existingPlayerAchievement;
    }

    const playerAchievement = await this.prisma.playerAchievement.create({
      data: {
        userId,
        achievementId,
        unlockedAt: new Date(),
        currentProgress: 0,
      },
      include: {
        achievement: true,
      },
    });

    return playerAchievement;
  }

  async updateAchievementProgress(userId: string, achievementId: string, progress: number) {
    const playerAchievement = await this.prisma.playerAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId,
        },
      },
      include: {
        achievement: true,
      },
    });

    if (!playerAchievement) {
      return null;
    }

    const updatedProgress = Math.min(progress, playerAchievement.achievement.targetValue);
    const isCompleted = updatedProgress >= playerAchievement.achievement.targetValue;

    const updated = await this.prisma.playerAchievement.update({
      where: {
        userId_achievementId: {
          userId,
          achievementId,
        },
      },
      data: {
        currentProgress: updatedProgress,
        completedAt: isCompleted && !playerAchievement.completedAt ? new Date() : playerAchievement.completedAt,
      },
      include: {
        achievement: true,
      },
    });

    return updated;
  }

  async grantCosmetic(userId: string, cosmeticId: string) {
    const existingPlayerCosmetic = await this.prisma.playerCosmetic.findUnique({
      where: {
        userId_cosmeticId: {
          userId,
          cosmeticId,
        },
      },
    });

    if (existingPlayerCosmetic) {
      return existingPlayerCosmetic;
    }

    const playerCosmetic = await this.prisma.playerCosmetic.create({
      data: {
        userId,
        cosmeticId,
        unlockedAt: new Date(),
      },
      include: {
        cosmetic: true,
      },
    });

    return playerCosmetic;
  }

  async getUserRewards(userId: string) {
    const [titles, bonuses, achievements, cosmetics] = await Promise.all([
      this.prisma.playerTitle.findMany({
        where: { userId },
        include: { title: true },
        orderBy: { unlockedAt: 'desc' },
      }),
      this.prisma.playerBonus.findMany({
        where: { userId },
        include: { bonus: true },
        orderBy: { unlockedAt: 'desc' },
      }),
      this.prisma.playerAchievement.findMany({
        where: { userId },
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' },
      }),
      this.prisma.playerCosmetic.findMany({
        where: { userId },
        include: { cosmetic: true },
        orderBy: { unlockedAt: 'desc' },
      }),
    ]);

    return {
      titles,
      bonuses,
      achievements,
      cosmetics,
    };
  }

  async getActiveTitle(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        activeTitle: true,
      },
    });

    return user?.activeTitle || null;
  }

  async setActiveTitle(userId: string, titleId: string | null) {
    if (titleId) {
      const playerTitle = await this.prisma.playerTitle.findUnique({
        where: {
          userId_titleId: {
            userId,
            titleId,
          },
        },
      });

      if (!playerTitle) {
        throw new Error("Title not owned by user");
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        activeTitleId: titleId,
      },
      include: {
        activeTitle: true,
      },
    });

    return user.activeTitle;
  }

  async calculateUserBonuses(userId: string) {
    const playerBonuses = await this.prisma.playerBonus.findMany({
      where: { userId },
      include: { bonus: true },
    });

    const bonuses = {
      productionMultiplier: 1,
      resourceBonus: 0,
      combatBonus: 0,
      populationBonus: 0,
      buildingBonus: 0,
      techBonus: 0,
    };

    for (const playerBonus of playerBonuses) {
      const bonus = playerBonus.bonus;
      
      switch (bonus.type) {
        case BonusType.PRODUCTION_MULTIPLIER:
          bonuses.productionMultiplier *= (1 + bonus.value);
          break;
        case BonusType.RESOURCE_BONUS:
          bonuses.resourceBonus += bonus.value;
          break;
        case BonusType.COMBAT_BONUS:
          bonuses.combatBonus += bonus.value;
          break;
        case BonusType.POPULATION_BONUS:
          bonuses.populationBonus += bonus.value;
          break;
        case BonusType.BUILDING_BONUS:
          bonuses.buildingBonus += bonus.value;
          break;
        case BonusType.TECH_BONUS:
          bonuses.techBonus += bonus.value;
          break;
      }
    }

    return bonuses;
  }

  async checkAchievements(userId: string, metrics: {
    totalPopulation?: number;
    totalCities?: number;
    totalProvinces?: number;
    totalResources?: number;
    totalTechnologies?: number;
    totalCombatsWon?: number;
    totalBuildings?: number;
    totalSeasons?: number;
    allianceRank?: number;
    highestRank?: number;
  }) {
    const achievements = await this.prisma.achievement.findMany();
    const updatedAchievements = [];

    for (const achievement of achievements) {
      let currentValue = 0;

      switch (achievement.category) {
        case AchievementCategory.POPULATION:
          currentValue = metrics.totalPopulation || 0;
          break;
        case AchievementCategory.EXPANSION:
          currentValue = (metrics.totalCities || 0) + (metrics.totalProvinces || 0);
          break;
        case AchievementCategory.ECONOMY:
          currentValue = metrics.totalResources || 0;
          break;
        case AchievementCategory.TECHNOLOGY:
          currentValue = metrics.totalTechnologies || 0;
          break;
        case AchievementCategory.COMBAT:
          currentValue = metrics.totalCombatsWon || 0;
          break;
        case AchievementCategory.BUILDING:
          currentValue = metrics.totalBuildings || 0;
          break;
        case AchievementCategory.SOCIAL:
          currentValue = metrics.allianceRank || 0;
          break;
        case AchievementCategory.SEASONAL:
          currentValue = metrics.totalSeasons || 0;
          break;
        case AchievementCategory.RANKING:
          currentValue = metrics.highestRank || 0;
          break;
      }

      const updated = await this.updateAchievementProgress(userId, achievement.id, currentValue);
      if (updated) {
        updatedAchievements.push(updated);
      }
    }

    return updatedAchievements;
  }

  async initializeRewards() {
    const existingTitles = await this.prisma.title.count();
    if (existingTitles > 0) return;

    const titles = [
      { name: "Novice", description: "First steps in the empire", rarity: TitleRarity.COMMON, category: TitleCategory.FOUNDER },
      { name: "Builder", description: "Constructed 10 buildings", rarity: TitleRarity.COMMON, category: TitleCategory.ACHIEVEMENT },
      { name: "Conqueror", description: "Won 50 battles", rarity: TitleRarity.RARE, category: TitleCategory.ACHIEVEMENT },
      { name: "Emperor", description: "Reached top 10 ranking", rarity: TitleRarity.LEGENDARY, category: TitleCategory.SEASONAL },
    ];

    const bonuses = [
      { name: "Production Boost I", description: "+10% production", type: BonusType.PRODUCTION_MULTIPLIER, value: 0.1 },
      { name: "Resource Cache", description: "+1000 resources", type: BonusType.RESOURCE_BONUS, value: 1000 },
      { name: "Combat Expert", description: "+20% combat effectiveness", type: BonusType.COMBAT_BONUS, value: 0.2 },
    ];

    const achievements = [
      { name: "Population Milestone", description: "Reach 10,000 population", category: AchievementCategory.POPULATION, targetValue: 10000 },
      { name: "Tech Researcher", description: "Research 25 technologies", category: AchievementCategory.TECHNOLOGY, targetValue: 25 },
      { name: "War Chief", description: "Win 100 battles", category: AchievementCategory.COMBAT, targetValue: 100 },
    ];

    const cosmetics = [
      { name: "Golden Crown", description: "Shiny crown for emperors", type: "AVATAR_DECORATION" },
      { name: "Red Banner", description: "War banner", type: "BANNER" },
    ];

    await this.prisma.title.createMany({ data: titles });
    await this.prisma.bonus.createMany({ data: bonuses });
    await this.prisma.achievement.createMany({ data: achievements });
    await this.prisma.cosmetic.createMany({ data: cosmetics });
  }
}