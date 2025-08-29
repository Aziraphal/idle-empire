// Timer service for managing construction and research tasks

export interface BuildingData {
  type: string;
  level: number;
  buildTime: number;  // in hours
  cost: {
    gold?: number;
    food?: number;
    stone?: number;
    iron?: number;
    population?: number;
  };
  requirements?: {
    minLevel?: number;
    requiredBuildings?: Array<{ type: string; level: number }>;
    requiredTech?: string[];
  };
}

export interface TechnologyData {
  key: string;
  name: string;
  description: string;
  tier: number;
  category: string;
  researchTime: number; // in hours
  cost: {
    gold?: number;
    food?: number;
    stone?: number;
    iron?: number;
    influence?: number;
  };
  prerequisites?: string[];
  effects: {
    description: string;
    modifiers?: Record<string, number>;
  };
}

// Building definitions with construction times and costs
export const BUILDING_DATA: Record<string, BuildingData> = {
  FARM: {
    type: "FARM",
    level: 1,
    buildTime: 0.5, // 30 minutes for level 1
    cost: { gold: 100, stone: 50 },
  },
  MINE: {
    type: "MINE",
    level: 1,
    buildTime: 1, // 1 hour
    cost: { gold: 150, stone: 100 },
  },
  QUARRY: {
    type: "QUARRY", 
    level: 1,
    buildTime: 1,
    cost: { gold: 120, food: 50 },
  },
  BARRACKS: {
    type: "BARRACKS",
    level: 1,
    buildTime: 2, // 2 hours
    cost: { gold: 200, stone: 150, iron: 50 },
    requirements: {
      minLevel: 1,
    },
  },
  MARKETPLACE: {
    type: "MARKETPLACE",
    level: 1,
    buildTime: 3, // 3 hours
    cost: { gold: 300, stone: 200, iron: 100 },
    requirements: {
      minLevel: 2,
    },
  },
  ACADEMY: {
    type: "ACADEMY",
    level: 1,
    buildTime: 4, // 4 hours
    cost: { gold: 500, stone: 300, iron: 200 },
    requirements: {
      minLevel: 3,
      requiredBuildings: [{ type: "MARKETPLACE", level: 1 }],
    },
  },
};

// Technology tree
export const TECHNOLOGY_DATA: Record<string, TechnologyData> = {
  AGRICULTURE_1: {
    key: "AGRICULTURE_1",
    name: "Agricultural Techniques",
    description: "Improved farming methods increase food production by 25%",
    tier: 1,
    category: "ECONOMY",
    researchTime: 2, // 2 hours
    cost: { gold: 200, influence: 10 },
    effects: {
      description: "+25% food production from farms",
      modifiers: { food_production: 1.25 },
    },
  },
  MINING_1: {
    key: "MINING_1",
    name: "Mining Techniques",
    description: "Better mining tools increase gold and iron production by 20%",
    tier: 1,
    category: "ECONOMY",
    researchTime: 3,
    cost: { gold: 300, stone: 100, influence: 15 },
    effects: {
      description: "+20% gold and iron production",
      modifiers: { gold_production: 1.2, iron_production: 1.2 },
    },
  },
  CONSTRUCTION_1: {
    key: "CONSTRUCTION_1",
    name: "Advanced Construction",
    description: "Reduces building construction time by 25%",
    tier: 1,
    category: "INFRASTRUCTURE",
    researchTime: 4,
    cost: { gold: 400, stone: 200, influence: 20 },
    effects: {
      description: "-25% construction time",
      modifiers: { construction_speed: 1.33 },
    },
  },
  MILITARY_1: {
    key: "MILITARY_1",
    name: "Military Organization",
    description: "Improves troop efficiency and influence generation",
    tier: 1,
    category: "MILITARY",
    researchTime: 5,
    cost: { gold: 500, iron: 150, influence: 25 },
    prerequisites: ["CONSTRUCTION_1"],
    effects: {
      description: "+30% influence from military buildings",
      modifiers: { influence_production: 1.3 },
    },
  },
  TRADE_1: {
    key: "TRADE_1",
    name: "Trade Networks",
    description: "Establishes trade routes, boosting gold production by 40%",
    tier: 1,
    category: "ECONOMY",
    researchTime: 6,
    cost: { gold: 600, influence: 30 },
    prerequisites: ["MINING_1"],
    effects: {
      description: "+40% gold production from all sources",
      modifiers: { gold_production: 1.4 },
    },
  },

  // Tier 2 Technologies
  AGRICULTURE_2: {
    key: "AGRICULTURE_2",
    name: "Crop Rotation",
    description: "Advanced farming techniques increase food production by 50%",
    tier: 2,
    category: "ECONOMY",
    researchTime: 8,
    cost: { gold: 800, food: 200, influence: 40 },
    prerequisites: ["AGRICULTURE_1"],
    effects: {
      description: "+50% food production from farms",
      modifiers: { food_production: 1.5 },
    },
  },

  MINING_2: {
    key: "MINING_2",
    name: "Industrial Mining",
    description: "Advanced extraction methods boost mining output significantly",
    tier: 2,
    category: "ECONOMY",
    researchTime: 10,
    cost: { gold: 1200, stone: 400, iron: 200, influence: 50 },
    prerequisites: ["MINING_1"],
    effects: {
      description: "+60% gold and iron production",
      modifiers: { gold_production: 1.6, iron_production: 1.6 },
    },
  },

  ENGINEERING: {
    key: "ENGINEERING",
    name: "Engineering",
    description: "Advanced construction techniques and fortifications",
    tier: 2,
    category: "INFRASTRUCTURE",
    researchTime: 12,
    cost: { gold: 1000, stone: 500, influence: 60 },
    prerequisites: ["CONSTRUCTION_1"],
    effects: {
      description: "+40% construction speed and defense bonuses",
      modifiers: { construction_speed: 1.4 },
    },
  },

  MILITARY_2: {
    key: "MILITARY_2",
    name: "Professional Army",
    description: "Organized military units with better training and equipment",
    tier: 2,
    category: "MILITARY",
    researchTime: 14,
    cost: { gold: 1500, iron: 600, influence: 80 },
    prerequisites: ["MILITARY_1"],
    effects: {
      description: "+100% influence from military buildings",
      modifiers: { influence_production: 2.0 },
    },
  },

  SCHOLARSHIP: {
    key: "SCHOLARSHIP",
    name: "Scholarship",
    description: "Centers of learning accelerate research and cultural development",
    tier: 2,
    category: "SCIENCE",
    researchTime: 16,
    cost: { gold: 1000, stone: 300, influence: 100 },
    prerequisites: ["CONSTRUCTION_1"],
    effects: {
      description: "+25% research speed and cultural bonuses",
      modifiers: { research_speed: 1.25 },
    },
  },
};

// Calculate building upgrade cost and time based on current level
export function getBuildingUpgradeCost(buildingType: string, currentLevel: number): {
  time: number;
  cost: Record<string, number>;
} {
  const baseData = BUILDING_DATA[buildingType];
  if (!baseData) throw new Error(`Unknown building type: ${buildingType}`);

  // Cost and time scale by tiers of 5 levels
  // Levels 1-5: Base scaling
  // Levels 6-10: Slightly higher scaling
  // Levels 11-15: Moderate scaling
  // Levels 16-20: High scaling (soft cap)
  // Levels 21+: Very high scaling (hard cap)
  
  // Cost scaling (more aggressive)
  let costMultiplier = 1;
  if (currentLevel <= 5) {
    costMultiplier = Math.pow(1.3, currentLevel);
  } else if (currentLevel <= 10) {
    costMultiplier = Math.pow(1.3, 5) * Math.pow(1.4, currentLevel - 5);
  } else if (currentLevel <= 15) {
    costMultiplier = Math.pow(1.3, 5) * Math.pow(1.4, 5) * Math.pow(1.6, currentLevel - 10);
  } else if (currentLevel <= 20) {
    costMultiplier = Math.pow(1.3, 5) * Math.pow(1.4, 5) * Math.pow(1.6, 5) * Math.pow(2.0, currentLevel - 15);
  } else {
    costMultiplier = Math.pow(1.3, 5) * Math.pow(1.4, 5) * Math.pow(1.6, 5) * Math.pow(2.0, 5) * Math.pow(2.5, currentLevel - 20);
  }
  
  // Time scaling (much gentler, especially early game)
  let timeMultiplier = 1;
  if (currentLevel <= 5) {
    timeMultiplier = Math.pow(1.1, currentLevel); // Very gentle start
  } else if (currentLevel <= 10) {
    timeMultiplier = Math.pow(1.1, 5) * Math.pow(1.15, currentLevel - 5);
  } else if (currentLevel <= 15) {
    timeMultiplier = Math.pow(1.1, 5) * Math.pow(1.15, 5) * Math.pow(1.2, currentLevel - 10);
  } else if (currentLevel <= 20) {
    timeMultiplier = Math.pow(1.1, 5) * Math.pow(1.15, 5) * Math.pow(1.2, 5) * Math.pow(1.4, currentLevel - 15);
  } else {
    timeMultiplier = Math.pow(1.1, 5) * Math.pow(1.15, 5) * Math.pow(1.2, 5) * Math.pow(1.4, 5) * Math.pow(1.8, currentLevel - 20);
  }
  
  const levelMultiplier = costMultiplier;

  const upgradeCost: Record<string, number> = {};
  Object.entries(baseData.cost).forEach(([resource, amount]) => {
    upgradeCost[resource] = Math.ceil(amount * levelMultiplier);
  });

  return {
    time: baseData.buildTime * timeMultiplier,
    cost: upgradeCost,
  };
}

// Check if construction/research is complete
export function isTaskComplete(finishTime: Date, currentTime: Date = new Date()): boolean {
  return currentTime >= finishTime;
}

// Calculate remaining time for a task
export function getRemainingTime(finishTime: Date, currentTime: Date = new Date()): {
  isComplete: boolean;
  remainingMs: number;
  remainingHours: number;
  remainingMinutes: number;
} {
  const remainingMs = Math.max(0, finishTime.getTime() - currentTime.getTime());
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    isComplete: remainingMs === 0,
    remainingMs,
    remainingHours,
    remainingMinutes,
  };
}

// Format remaining time as string
export function formatRemainingTime(finishTime: Date, currentTime: Date = new Date()): string {
  const { isComplete, remainingHours, remainingMinutes } = getRemainingTime(finishTime, currentTime);
  
  if (isComplete) return "Complete!";
  
  if (remainingHours > 0) {
    return `${remainingHours}h ${remainingMinutes}m`;
  } else {
    return `${remainingMinutes}m`;
  }
}