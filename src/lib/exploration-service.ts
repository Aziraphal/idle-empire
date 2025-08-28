// Exploration and territorial expansion service
import { GovernorPersonality } from "@prisma/client";

export interface Territory {
  id: string;
  name: string;
  type: TerritoryType;
  difficulty: number; // 1-10, higher = more expensive/dangerous
  resources: TerritoryResources;
  specialFeatures: string[];
  explorationCost: Record<string, number>;
  colonizationCost: Record<string, number>;
  description: string;
}

export type TerritoryType = 
  | 'FERTILE_PLAINS'    // Bonus food production
  | 'MOUNTAIN_REGION'   // Bonus stone/iron production
  | 'FOREST_LANDS'      // Balanced resources
  | 'COASTAL_AREA'      // Bonus trade/influence
  | 'DESERT_OASIS'      // High difficulty, rare resources
  | 'ANCIENT_RUINS';    // Research bonuses, artifacts

export interface TerritoryResources {
  goldMultiplier: number;    // Base resource production multipliers
  foodMultiplier: number;
  stoneMultiplier: number;
  ironMultiplier: number;
  influenceMultiplier: number;
  populationCapacity: number; // Max population bonus
}

// Territory type definitions with their characteristics
export const TERRITORY_TYPES: Record<TerritoryType, {
  baseResources: TerritoryResources;
  features: string[];
  names: string[];
  descriptions: string[];
}> = {
  FERTILE_PLAINS: {
    baseResources: {
      goldMultiplier: 1.0,
      foodMultiplier: 1.5,
      stoneMultiplier: 0.8,
      ironMultiplier: 0.9,
      influenceMultiplier: 1.0,
      populationCapacity: 120,
    },
    features: [
      "Rich soil perfect for agriculture",
      "Natural grazing lands",
      "Abundant fresh water sources",
      "Fertile river delta",
    ],
    names: [
      "Verdant Valley", "Golden Fields", "Harvest Plains", "Greenvale", 
      "Abundant Meadows", "Fertile Crescent", "Bountiful Lands"
    ],
    descriptions: [
      "Vast plains stretch as far as the eye can see, with soil so rich it seems to glow.",
      "Rolling hills covered in wild grasses sway gently in the wind.",
      "A river delta creates perfect conditions for abundant crops."
    ],
  },
  MOUNTAIN_REGION: {
    baseResources: {
      goldMultiplier: 1.2,
      foodMultiplier: 0.7,
      stoneMultiplier: 1.8,
      ironMultiplier: 1.6,
      influenceMultiplier: 1.1,
      populationCapacity: 80,
    },
    features: [
      "Rich mineral deposits",
      "Natural stone quarries",
      "Defensive mountain passes",
      "Rare metal veins",
    ],
    names: [
      "Iron Peaks", "Stone Crown", "Mineral Heights", "Rocky Spires",
      "Golden Summit", "Granite Range", "Ore Mountains"
    ],
    descriptions: [
      "Towering peaks hide vast mineral wealth within their stone hearts.",
      "Ancient mountains reveal glinting veins of precious metals.",
      "Rocky cliffs provide natural fortification and abundant stone."
    ],
  },
  FOREST_LANDS: {
    baseResources: {
      goldMultiplier: 1.0,
      foodMultiplier: 1.1,
      stoneMultiplier: 1.0,
      ironMultiplier: 1.0,
      influenceMultiplier: 1.0,
      populationCapacity: 100,
    },
    features: [
      "Dense timber resources",
      "Natural hunting grounds",
      "Hidden clearings",
      "Medicinal herbs",
    ],
    names: [
      "Whispering Woods", "Ancient Grove", "Deepwood", "Timberlands",
      "Silverleaf Forest", "Elderwood", "Mystic Thicket"
    ],
    descriptions: [
      "Ancient trees form a canopy so thick that sunlight barely reaches the forest floor.",
      "Peaceful groves hide countless resources and natural wonders.",
      "Dense woodlands offer balanced resources and natural beauty."
    ],
  },
  COASTAL_AREA: {
    baseResources: {
      goldMultiplier: 1.3,
      foodMultiplier: 1.2,
      stoneMultiplier: 0.9,
      ironMultiplier: 0.8,
      influenceMultiplier: 1.4,
      populationCapacity: 110,
    },
    features: [
      "Natural harbors",
      "Trade wind advantages",
      "Rich fishing waters",
      "Salt deposits",
    ],
    names: [
      "Golden Coast", "Harbor Bay", "Trade Winds", "Azure Shores",
      "Merchant's Haven", "Salt Flats", "Pearl Waters"
    ],
    descriptions: [
      "A pristine coastline where merchant ships can dock safely in natural harbors.",
      "Rich fishing waters and trade winds make this an ideal commercial center.",
      "Sandy beaches hide valuable salt deposits and pearl beds."
    ],
  },
  DESERT_OASIS: {
    baseResources: {
      goldMultiplier: 1.5,
      foodMultiplier: 0.6,
      stoneMultiplier: 1.1,
      ironMultiplier: 1.3,
      influenceMultiplier: 1.2,
      populationCapacity: 70,
    },
    features: [
      "Rare gem deposits",
      "Precious metal veins",
      "Ancient trade routes",
      "Exotic spices",
    ],
    names: [
      "Mirage Springs", "Desert Jewel", "Sandstone Oasis", "Golden Dunes",
      "Caravan Rest", "Emerald Springs", "Nomad's Haven"
    ],
    descriptions: [
      "A life-giving oasis in the harsh desert, rumored to contain rare treasures.",
      "Ancient caravan routes converge at this vital water source.",
      "Harsh conditions hide incredible wealth for those brave enough to claim it."
    ],
  },
  ANCIENT_RUINS: {
    baseResources: {
      goldMultiplier: 1.1,
      foodMultiplier: 0.8,
      stoneMultiplier: 1.4,
      ironMultiplier: 1.1,
      influenceMultiplier: 1.6,
      populationCapacity: 90,
    },
    features: [
      "Archaeological treasures",
      "Ancient knowledge",
      "Mystical artifacts",
      "Historical significance",
    ],
    names: [
      "Lost Citadel", "Forgotten Temple", "Ancient Sanctum", "Ruined Palace",
      "Mysterious Stones", "Scholar's Dream", "Artifact Valley"
    ],
    descriptions: [
      "Crumbling ruins hint at a once-great civilization that ruled these lands.",
      "Ancient stones whisper secrets of forgotten knowledge and lost technologies.",
      "Archaeological wonders wait to be discovered among weathered monuments."
    ],
  },
};

// Generate a random territory for exploration
export function generateRandomTerritory(): Territory {
  const territoryTypes = Object.keys(TERRITORY_TYPES) as TerritoryType[];
  const randomType = territoryTypes[Math.floor(Math.random() * territoryTypes.length)];
  const typeData = TERRITORY_TYPES[randomType];
  
  // Random name from the type's name pool
  const randomName = typeData.names[Math.floor(Math.random() * typeData.names.length)];
  
  // Random description
  const randomDescription = typeData.descriptions[Math.floor(Math.random() * typeData.descriptions.length)];
  
  // Random difficulty (affects costs)
  const difficulty = Math.floor(Math.random() * 6) + 3; // 3-8 difficulty
  
  // Random special features (1-3 features)
  const numFeatures = Math.floor(Math.random() * 3) + 1;
  const shuffledFeatures = [...typeData.features].sort(() => Math.random() - 0.5);
  const selectedFeatures = shuffledFeatures.slice(0, numFeatures);
  
  // Apply some randomness to base resource multipliers (±20%)
  const resources: TerritoryResources = {
    goldMultiplier: typeData.baseResources.goldMultiplier * (0.8 + Math.random() * 0.4),
    foodMultiplier: typeData.baseResources.foodMultiplier * (0.8 + Math.random() * 0.4),
    stoneMultiplier: typeData.baseResources.stoneMultiplier * (0.8 + Math.random() * 0.4),
    ironMultiplier: typeData.baseResources.ironMultiplier * (0.8 + Math.random() * 0.4),
    influenceMultiplier: typeData.baseResources.influenceMultiplier * (0.8 + Math.random() * 0.4),
    populationCapacity: Math.floor(typeData.baseResources.populationCapacity * (0.8 + Math.random() * 0.4)),
  };
  
  // Calculate costs based on difficulty and type
  const baseCosts = {
    exploration: {
      gold: 200 * difficulty,
      food: 100 * difficulty,
      influence: 10 * difficulty,
    },
    colonization: {
      gold: 500 * difficulty,
      food: 300 * difficulty,
      stone: 200 * difficulty,
      iron: 100 * difficulty,
      population: 50 + (difficulty * 10),
      influence: 25 * difficulty,
    },
  };
  
  return {
    id: `territory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: randomName,
    type: randomType,
    difficulty,
    resources,
    specialFeatures: selectedFeatures,
    explorationCost: baseCosts.exploration,
    colonizationCost: baseCosts.colonization,
    description: randomDescription,
  };
}

// Calculate exploration success chance based on empire state
export function calculateExplorationSuccessChance(empireResources: Record<string, number>, territory: Territory): {
  successChance: number;
  canAfford: boolean;
  missingResources: Array<{ resource: string; needed: number; have: number }>;
} {
  let canAfford = true;
  const missingResources: Array<{ resource: string; needed: number; have: number }> = [];
  
  // Check if can afford exploration cost
  for (const [resource, cost] of Object.entries(territory.explorationCost)) {
    const available = empireResources[resource.toLowerCase()] || 0;
    if (available < cost) {
      canAfford = false;
      missingResources.push({
        resource,
        needed: cost,
        have: available,
      });
    }
  }
  
  if (!canAfford) {
    return { successChance: 0, canAfford: false, missingResources };
  }
  
  // Base success chance depends on difficulty (higher difficulty = lower chance)
  let successChance = Math.max(0.3, 1.0 - (territory.difficulty - 1) * 0.08); // 30% to 94%
  
  // Bonus for having excess resources
  const resourceAbundance = Object.values(empireResources).reduce((sum, amount) => sum + amount, 0);
  if (resourceAbundance > 5000) successChance += 0.1; // +10% for wealthy empire
  if (resourceAbundance > 10000) successChance += 0.1; // +20% total for very wealthy
  
  // Cap at 95%
  successChance = Math.min(0.95, successChance);
  
  return { successChance, canAfford: true, missingResources: [] };
}

// Generate governor candidates for a newly colonized territory
export function generateGovernorCandidates(): Array<{
  name: string;
  personality: GovernorPersonality;
  initialLoyalty: number;
  initialXP: number;
  description: string;
}> {
  const names = [
    // Roman-inspired names
    "Gaius Maximus", "Julia Victrix", "Marcus Aurelius", "Livia Fortuna",
    "Titus Valerius", "Claudia Magna", "Lucius Rex", "Octavia Prima",
    // Greek-inspired names  
    "Alexandros", "Theodora", "Nikias", "Helena", "Demetrius", "Sophia",
    // Fantasy names
    "Aldric Stormwind", "Elara Brightblade", "Thane Ironforge", "Lyra Goldmane",
    "Gareth Stoneheart", "Aria Swiftarrow", "Magnus Brightshield", "Sera Nightwhisper"
  ];
  
  const personalities: GovernorPersonality[] = ['CONSERVATIVE', 'AGGRESSIVE', 'MERCHANT', 'EXPLORER'];
  
  // Generate 3 random candidates
  return Array.from({ length: 3 }, () => {
    const personality = personalities[Math.floor(Math.random() * personalities.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    const initialLoyalty = Math.floor(Math.random() * 40) + 40; // 40-80%
    const initialXP = Math.floor(Math.random() * 200); // 0-200 XP
    
    const descriptions = {
      CONSERVATIVE: "A cautious leader focused on stability and defense.",
      AGGRESSIVE: "A bold commander eager to expand your empire's reach.",
      MERCHANT: "A shrewd trader who sees profit in every opportunity.",
      EXPLORER: "A curious scholar seeking knowledge and new frontiers.",
    };
    
    return {
      name,
      personality,
      initialLoyalty,
      initialXP,
      description: descriptions[personality],
    };
  });
}