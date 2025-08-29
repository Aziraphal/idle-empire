import { BuildingInstance, ResourceType, GovernorPersonality } from "@prisma/client";
import { calculateTechnologyBonuses, applyTechnologyBonuses, TechnologyBonus } from "./technology-effects";

// BASE PRODUCTION - Every player gets these rates automatically (per hour)
const BASE_PRODUCTION: Record<ResourceType, number> = {
  GOLD: 20,        // Base gold income
  FOOD: 25,        // Base food production  
  STONE: 10,       // Base stone gathering
  IRON: 5,         // Base iron mining
  POP: 2,          // Base population growth
  INFLUENCE: 5,    // Base influence
};

// Production rates per hour by building type and level
const BUILDING_PRODUCTION: Record<string, Record<ResourceType, number>> = {
  FARM: {
    GOLD: 0,
    FOOD: 50, // per level per hour
    STONE: 0,
    IRON: 0,
    POP: 5,   // farms increase population capacity
    INFLUENCE: 0,
  },
  MINE: {
    GOLD: 30,
    FOOD: 0,
    STONE: 0,
    IRON: 25,
    POP: 0,
    INFLUENCE: 0,
  },
  QUARRY: {
    GOLD: 10,
    FOOD: 0,
    STONE: 40,
    IRON: 0,
    POP: 0,
    INFLUENCE: 0,
  },
  BARRACKS: {
    GOLD: 0,
    FOOD: -10, // barracks consume food
    STONE: 0,
    IRON: 0,
    POP: 0,
    INFLUENCE: 15, // military increases influence
  },
  MARKETPLACE: {
    GOLD: 80,
    FOOD: 0,
    STONE: 0,
    IRON: 0,
    POP: 0,
    INFLUENCE: 10,
  },
};

// Governor personality modifiers
const GOVERNOR_MODIFIERS: Record<GovernorPersonality, Record<ResourceType, number>> = {
  CONSERVATIVE: {
    GOLD: 1.1,   // +10% gold (safe investments)
    FOOD: 1.2,   // +20% food (focus on stability)
    STONE: 1.0,
    IRON: 0.9,   // -10% iron (less military)
    POP: 1.1,    // +10% population growth
    INFLUENCE: 0.95,
  },
  AGGRESSIVE: {
    GOLD: 0.9,   // -10% gold (more spending on military)
    FOOD: 0.95,
    STONE: 1.0,
    IRON: 1.3,   // +30% iron (military focus)
    POP: 0.9,    // -10% pop (wars)
    INFLUENCE: 1.2, // +20% influence (conquest)
  },
  MERCHANT: {
    GOLD: 1.4,   // +40% gold (trade expertise)
    FOOD: 1.0,
    STONE: 1.1,  // +10% stone (infrastructure)
    IRON: 1.0,
    POP: 1.05,   // +5% population (commerce attracts people)
    INFLUENCE: 1.1, // +10% influence (trade networks)
  },
  EXPLORER: {
    GOLD: 1.15,  // +15% gold (discoveries)
    FOOD: 1.0,
    STONE: 1.2,  // +20% stone (finding quarries)
    IRON: 1.15,  // +15% iron (mining discoveries)
    POP: 0.95,   // -5% pop (people leave to explore)
    INFLUENCE: 1.3, // +30% influence (territorial expansion)
  },
};

export interface ProductionResult {
  totalGained: Record<ResourceType, number>;
  hourlyRate: Record<ResourceType, number>;
  timeDelta: number;
}

export function calculateIdleProduction(
  buildings: BuildingInstance[],
  governorPersonality: GovernorPersonality | null,
  lastProductionTime: Date,
  researchedTechnologies: string[] = [],
  currentTime: Date = new Date()
): ProductionResult {
  // Calculate time delta in hours
  const timeDeltaMs = currentTime.getTime() - lastProductionTime.getTime();
  const timeDeltaHours = Math.max(0, timeDeltaMs / (1000 * 60 * 60));

  // Initialize production rates with BASE PRODUCTION
  const hourlyRate: Record<ResourceType, number> = {
    GOLD: BASE_PRODUCTION.GOLD,
    FOOD: BASE_PRODUCTION.FOOD,
    STONE: BASE_PRODUCTION.STONE,
    IRON: BASE_PRODUCTION.IRON,
    POP: BASE_PRODUCTION.POP,
    INFLUENCE: BASE_PRODUCTION.INFLUENCE,
  };

  // Calculate technology bonuses first
  const technologyBonuses = calculateTechnologyBonuses(researchedTechnologies);

  // Calculate base production from buildings with technology bonuses
  buildings.forEach((building) => {
    const buildingProduction = BUILDING_PRODUCTION[building.type];
    if (buildingProduction) {
      // Apply technology bonuses to building production
      const enhancedProduction = applyTechnologyBonuses(
        buildingProduction as Record<string, number>,
        building.type,
        technologyBonuses
      );
      
      Object.entries(enhancedProduction).forEach(([resource, rate]) => {
        const resourceType = resource as ResourceType;
        // Production scales with building level
        hourlyRate[resourceType] += rate * building.level;
      });
    }
  });

  // Apply governor modifiers
  if (governorPersonality) {
    const modifiers = GOVERNOR_MODIFIERS[governorPersonality];
    Object.entries(modifiers).forEach(([resource, modifier]) => {
      const resourceType = resource as ResourceType;
      hourlyRate[resourceType] *= modifier;
    });
  }

  // Apply additional technology bonuses to final production
  Object.entries(hourlyRate).forEach(([resource, rate]) => {
    const resourceType = resource as ResourceType;
    // Apply population growth bonus
    if (resourceType === 'POP') {
      hourlyRate[resourceType] *= technologyBonuses.populationGrowth;
    }
    // Apply influence generation bonus
    if (resourceType === 'INFLUENCE') {
      hourlyRate[resourceType] *= technologyBonuses.influenceGeneration;
    }
  });

  // Calculate total gained over time period
  const totalGained: Record<ResourceType, number> = {
    GOLD: Math.floor(hourlyRate.GOLD * timeDeltaHours),
    FOOD: Math.floor(hourlyRate.FOOD * timeDeltaHours),
    STONE: Math.floor(hourlyRate.STONE * timeDeltaHours),
    IRON: Math.floor(hourlyRate.IRON * timeDeltaHours),
    POP: Math.floor(hourlyRate.POP * timeDeltaHours),
    INFLUENCE: Math.floor(hourlyRate.INFLUENCE * timeDeltaHours),
  };

  return {
    totalGained,
    hourlyRate,
    timeDelta: timeDeltaHours,
  };
}