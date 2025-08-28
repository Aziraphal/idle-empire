// Season Management System
import { PrismaClient, SeasonStatus, RankingType } from "@prisma/client";

export interface SeasonConfig {
  number: number;
  name: string;
  theme: string;
  description: string;
  startDate: Date;
  endDate: Date;
  availableTechs: string[];
  newFeatures?: any;
  rewards?: any;
}

// Predefined season configurations
export const SEASON_CONFIGS: Record<number, SeasonConfig> = {
  1: {
    number: 1,
    name: "L'Éveil",
    theme: "BASE",
    description: "Les fondations de votre empire. Maîtrisez l'agriculture, l'exploitation minière et la construction pour établir votre domination.",
    startDate: new Date("2025-01-01T00:00:00Z"),
    endDate: new Date("2025-07-01T00:00:00Z"), // 6 months
    availableTechs: [
      "AGRICULTURE_1", "MINING_1", "CONSTRUCTION_1", "MILITARY_1", "TRADE_1",
      "AGRICULTURE_2", "MINING_2", "ENGINEERING", "MILITARY_2", "SCHOLARSHIP"
    ],
    newFeatures: {
      description: "Season inaugurale avec les mécaniques de base",
      mechanics: ["basic_buildings", "basic_events", "basic_combat"]
    },
    rewards: {
      top_10: { title: "Fondateur Légendaire", bonus_xp: 0.15, cosmetics: ["golden_banner"] },
      top_100: { title: "Pionnier", bonus_resources: 0.10, cosmetics: ["bronze_banner"] },
      participation: { cosmetics: ["participant_badge"] }
    }
  },

  2: {
    number: 2,
    name: "Les Conquérants",
    theme: "WARFARE",
    description: "L'ère de la guerre et de la diplomatie. Nouvelles technologies militaires, ennemis redoutables et alliances stratégiques.",
    startDate: new Date("2025-07-01T00:00:00Z"),
    endDate: new Date("2025-12-01T00:00:00Z"), // 5 months
    availableTechs: [
      // Base techs available
      "AGRICULTURE_1", "MINING_1", "CONSTRUCTION_1", "MILITARY_1", "TRADE_1",
      "AGRICULTURE_2", "MINING_2", "ENGINEERING", "MILITARY_2", "SCHOLARSHIP",
      // New warfare techs
      "SIEGE_WARFARE", "ESPIONAGE", "DIPLOMACY", "FORTIFICATIONS", "WAR_ECONOMY"
    ],
    newFeatures: {
      description: "Nouvelles mécaniques de guerre et diplomatie",
      mechanics: ["alliance_wars", "siege_battles", "spy_networks", "diplomatic_missions"],
      new_enemies: ["RIVAL_LORDS", "DRAGON_ATTACKS", "MERCENARY_BANDS"],
      new_buildings: ["FORTRESS", "SPY_NETWORK", "DIPLOMATIC_EMBASSY"]
    },
    rewards: {
      top_10: { title: "Conquérant Suprême", bonus_xp: 0.20, cosmetics: ["war_banner", "crown_of_conquest"] },
      top_100: { title: "Général", bonus_resources: 0.15, cosmetics: ["military_insignia"] },
      participation: { cosmetics: ["warrior_badge"] }
    }
  },

  3: {
    number: 3,
    name: "L'Ère Magique",
    theme: "MAGIC",
    description: "La magie émerge dans le monde. Découvrez l'alchimie, les artefacts anciens et les créatures mystiques.",
    startDate: new Date("2025-12-01T00:00:00Z"),
    endDate: new Date("2026-05-01T00:00:00Z"), // 5 months
    availableTechs: [
      // Previous techs + magic
      "AGRICULTURE_1", "MINING_1", "CONSTRUCTION_1", "MILITARY_1", "TRADE_1",
      "AGRICULTURE_2", "MINING_2", "ENGINEERING", "MILITARY_2", "SCHOLARSHIP",
      "SIEGE_WARFARE", "ESPIONAGE", "DIPLOMACY", "FORTIFICATIONS", "WAR_ECONOMY",
      // Magic techs
      "ALCHEMY", "ENCHANTMENT", "SUMMONING", "ARCANE_RESEARCH", "MAGICAL_DEFENSES"
    ],
    newFeatures: {
      description: "Système magique complet avec sorts et artefacts",
      mechanics: ["spell_casting", "artifact_crafting", "magical_creatures", "mana_management"],
      new_enemies: ["ELEMENTAL_STORMS", "ROGUE_WIZARDS", "DEMONIC_INCURSIONS"],
      new_buildings: ["MAGE_TOWER", "ALCHEMICAL_LAB", "ENCHANTED_VAULT"],
      new_resources: ["MANA", "ARCANE_CRYSTALS"]
    },
    rewards: {
      top_10: { title: "Archimage", bonus_xp: 0.25, cosmetics: ["mystical_aura", "staff_of_power"] },
      top_100: { title: "Sorcier", bonus_resources: 0.20, cosmetics: ["magical_robes"] },
      participation: { cosmetics: ["apprentice_hat"] }
    }
  }
};

export class SeasonManager {
  constructor(private prisma: PrismaClient) {}

  // Get current active season
  async getCurrentSeason() {
    return await this.prisma.season.findFirst({
      where: { status: SeasonStatus.ACTIVE },
      include: {
        playerSeasons: {
          include: {
            user: {
              select: { username: true }
            }
          }
        }
      }
    });
  }

  // Initialize a new season
  async initializeSeason(seasonNumber: number) {
    const config = SEASON_CONFIGS[seasonNumber];
    if (!config) {
      throw new Error(`No configuration found for season ${seasonNumber}`);
    }

    // Check if season already exists
    const existingSeason = await this.prisma.season.findUnique({
      where: { number: seasonNumber }
    });

    if (existingSeason) {
      throw new Error(`Season ${seasonNumber} already exists`);
    }

    // Create the season
    const season = await this.prisma.season.create({
      data: {
        number: config.number,
        name: config.name,
        theme: config.theme,
        description: config.description,
        startDate: config.startDate,
        endDate: config.endDate,
        availableTechs: config.availableTechs,
        newFeatures: config.newFeatures || {},
        rewards: config.rewards || {},
        status: SeasonStatus.UPCOMING
      }
    });

    return season;
  }

  // Start a season (make it active)
  async startSeason(seasonNumber: number) {
    // End any currently active season
    await this.prisma.season.updateMany({
      where: { status: SeasonStatus.ACTIVE },
      data: { status: SeasonStatus.ENDED }
    });

    // Start the new season
    const season = await this.prisma.season.update({
      where: { number: seasonNumber },
      data: { status: SeasonStatus.ACTIVE }
    });

    // Initialize all existing users in this season
    const users = await this.prisma.user.findMany();
    const playerSeasonData = users.map(user => ({
      userId: user.id,
      seasonId: season.id
    }));

    await this.prisma.playerSeason.createMany({
      data: playerSeasonData,
      skipDuplicates: true
    });

    return season;
  }

  // End current season and process rewards
  async endCurrentSeason() {
    const currentSeason = await this.getCurrentSeason();
    if (!currentSeason) {
      throw new Error("No active season to end");
    }

    // Calculate final rankings
    await this.calculateFinalRankings(currentSeason.id);

    // Process rewards
    await this.processSeasonRewards(currentSeason.id);

    // Mark season as ended
    await this.prisma.season.update({
      where: { id: currentSeason.id },
      data: { status: SeasonStatus.ENDED }
    });

    return currentSeason;
  }

  // Register a user for the current season
  async registerUserForSeason(userId: string) {
    const currentSeason = await this.getCurrentSeason();
    if (!currentSeason) {
      throw new Error("No active season to register for");
    }

    const playerSeason = await this.prisma.playerSeason.upsert({
      where: {
        userId_seasonId: {
          userId,
          seasonId: currentSeason.id
        }
      },
      update: {
        isActive: true
      },
      create: {
        userId,
        seasonId: currentSeason.id,
        isActive: true
      }
    });

    return playerSeason;
  }

  // Update player season stats
  async updatePlayerStats(userId: string, stats: {
    totalPower?: bigint;
    resourcesEarned?: any;
    technologiesCount?: number;
    combatVictories?: number;
    buildingsBuilt?: number;
  }) {
    const currentSeason = await this.getCurrentSeason();
    if (!currentSeason) return;

    const playerSeason = await this.prisma.playerSeason.findUnique({
      where: {
        userId_seasonId: {
          userId,
          seasonId: currentSeason.id
        }
      }
    });

    if (!playerSeason) {
      // Auto-register user if not already registered
      await this.registerUserForSeason(userId);
    }

    // Calculate power growth
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const updateData: any = { ...stats };

    // If we're updating total power, calculate growth metrics
    if (stats.totalPower !== undefined) {
      const previousStats = await this.prisma.playerSeason.findUnique({
        where: {
          userId_seasonId: {
            userId,
            seasonId: currentSeason.id
          }
        }
      });

      if (previousStats) {
        const powerDelta = stats.totalPower - previousStats.totalPower;
        
        // Simple approximation - in a real system you'd track historical data
        updateData.powerGrowth7d = powerDelta;
        updateData.powerGrowth30d = powerDelta;
      }
    }

    await this.prisma.playerSeason.update({
      where: {
        userId_seasonId: {
          userId,
          seasonId: currentSeason.id
        }
      },
      data: updateData
    });
  }

  // Calculate and update all rankings for a season
  async calculateFinalRankings(seasonId: string) {
    const rankings: RankingType[] = [
      RankingType.TOTAL_POWER,
      RankingType.GROWTH_7D,
      RankingType.GROWTH_30D,
      RankingType.TECHNOLOGIES,
      RankingType.COMBAT,
      RankingType.BUILDINGS
    ];

    for (const rankingType of rankings) {
      await this.updateRanking(seasonId, rankingType);
    }
  }

  // Update specific ranking type
  async updateRanking(seasonId: string, rankingType: RankingType) {
    let orderByField: string;
    let scoreField: string;

    switch (rankingType) {
      case RankingType.TOTAL_POWER:
        orderByField = 'totalPower';
        scoreField = 'totalPower';
        break;
      case RankingType.GROWTH_7D:
        orderByField = 'powerGrowth7d';
        scoreField = 'powerGrowth7d';
        break;
      case RankingType.GROWTH_30D:
        orderByField = 'powerGrowth30d';
        scoreField = 'powerGrowth30d';
        break;
      case RankingType.TECHNOLOGIES:
        orderByField = 'technologiesCount';
        scoreField = 'technologiesCount';
        break;
      case RankingType.COMBAT:
        orderByField = 'combatVictories';
        scoreField = 'combatVictories';
        break;
      case RankingType.BUILDINGS:
        orderByField = 'buildingsBuilt';
        scoreField = 'buildingsBuilt';
        break;
      default:
        throw new Error(`Unknown ranking type: ${rankingType}`);
    }

    // Get sorted player seasons
    const playerSeasons = await this.prisma.playerSeason.findMany({
      where: { seasonId },
      orderBy: { [orderByField]: 'desc' },
      include: {
        user: true
      }
    });

    // Delete existing rankings for this type
    await this.prisma.seasonRanking.deleteMany({
      where: {
        seasonId,
        rankingType
      }
    });

    // Create new rankings
    const rankingData = playerSeasons.map((playerSeason, index) => ({
      seasonId,
      userId: playerSeason.userId,
      rankingType,
      rank: index + 1,
      score: BigInt((playerSeason as any)[scoreField] || 0),
      snapshotAt: new Date()
    }));

    if (rankingData.length > 0) {
      await this.prisma.seasonRanking.createMany({
        data: rankingData
      });
    }
  }

  // Process end-of-season rewards
  async processSeasonRewards(seasonId: string) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId }
    });

    if (!season || !season.rewards) return;

    const rewards = season.rewards as any;
    
    // Get final power rankings
    const powerRankings = await this.prisma.seasonRanking.findMany({
      where: {
        seasonId,
        rankingType: RankingType.TOTAL_POWER
      },
      orderBy: { rank: 'asc' },
      include: {
        user: true
      }
    });

    // Process rewards for different tiers
    const rewardPromises = powerRankings.map(async (ranking) => {
      let rewardTier;
      
      if (ranking.rank <= 10) {
        rewardTier = rewards.top_10;
      } else if (ranking.rank <= 100) {
        rewardTier = rewards.top_100;
      } else {
        rewardTier = rewards.participation;
      }

      // Update player season with final rank and rewards
      await this.prisma.playerSeason.update({
        where: {
          userId_seasonId: {
            userId: ranking.userId,
            seasonId
          }
        },
        data: {
          finalRank: ranking.rank,
          seasonRewards: rewardTier
        }
      });
    });

    await Promise.all(rewardPromises);
  }

  // Get season leaderboards
  async getSeasonLeaderboard(seasonId: string, rankingType: RankingType, limit = 100) {
    return await this.prisma.seasonRanking.findMany({
      where: {
        seasonId,
        rankingType
      },
      orderBy: { rank: 'asc' },
      take: limit,
      include: {
        user: {
          select: {
            username: true,
            createdAt: true
          }
        }
      }
    });
  }

  // Get available technologies for current season
  async getSeasonTechnologies(seasonId?: string) {
    const season = seasonId 
      ? await this.prisma.season.findUnique({ where: { id: seasonId } })
      : await this.getCurrentSeason();

    if (!season) {
      throw new Error("No season found");
    }

    return season.availableTechs;
  }

  // Check if a technology is available in current season
  async isTechnologyAvailable(techKey: string, seasonId?: string) {
    const availableTechs = await this.getSeasonTechnologies(seasonId);
    return availableTechs.includes(techKey);
  }
}