// Governor AI service - Simple rule-based decision making for autonomous governors
import { GovernorPersonality, ResourceType } from "@prisma/client";
import { BUILDING_DATA, getBuildingUpgradeCost, TECHNOLOGY_DATA } from "./timer-service";

export interface GovernorDecision {
  type: 'BUILD' | 'RESEARCH' | 'WAIT';
  action?: {
    buildingType?: string;
    techKey?: string;
    reason: string;
    priority: number; // 1-10, higher = more urgent
  };
}

export interface ProvinceState {
  id: string;
  name: string;
  resources: Record<string, number>;
  buildings: Array<{ type: string; level: number }>;
  activeConstructions: Array<{ buildingType: string; finishesAt: Date }>;
  governor: {
    name: string;
    personality: GovernorPersonality;
    loyalty: number;
    xp: number;
  };
}

export interface EmpireState {
  provinces: ProvinceState[];
  activeResearches: Array<{ techKey: string; finishesAt: Date }>;
  totalResources: Record<string, number>;
}

// Personality-based priorities for buildings
const PERSONALITY_BUILDING_PRIORITIES: Record<GovernorPersonality, Record<string, number>> = {
  CONSERVATIVE: {
    FARM: 10,      // Food security first
    QUARRY: 8,     // Building materials
    BARRACKS: 6,   // Defense
    MINE: 5,       // Economy
    MARKETPLACE: 3,
    ACADEMY: 2,
  },
  AGGRESSIVE: {
    BARRACKS: 10,  // Military first
    MINE: 8,       // Resources for military
    ACADEMY: 6,    // Military research
    FARM: 5,       // Support population
    QUARRY: 4,
    MARKETPLACE: 2,
  },
  MERCHANT: {
    MARKETPLACE: 10, // Trade first
    MINE: 9,         // Gold production
    FARM: 6,         // Population support
    QUARRY: 5,       // Infrastructure
    ACADEMY: 4,      // Trade research
    BARRACKS: 2,
  },
  EXPLORER: {
    ACADEMY: 10,   // Knowledge first
    MINE: 7,       // Resources for exploration
    MARKETPLACE: 6, // Trade networks
    FARM: 5,       // Population support
    QUARRY: 4,
    BARRACKS: 3,
  },
};

// Personality-based research priorities
const PERSONALITY_RESEARCH_PRIORITIES: Record<GovernorPersonality, Record<string, number>> = {
  CONSERVATIVE: {
    AGRICULTURE_1: 10,    // Food production
    CONSTRUCTION_1: 8,    // Faster building
    MINING_1: 6,
    TRADE_1: 4,
    MILITARY_1: 3,
  },
  AGGRESSIVE: {
    MILITARY_1: 10,       // Combat effectiveness
    CONSTRUCTION_1: 8,    // Faster military buildings
    MINING_1: 6,          // Resources for military
    AGRICULTURE_1: 4,
    TRADE_1: 2,
  },
  MERCHANT: {
    TRADE_1: 10,          // Trade bonuses
    MINING_1: 9,          // Gold production
    AGRICULTURE_1: 6,     // Population support
    CONSTRUCTION_1: 5,
    MILITARY_1: 2,
  },
  EXPLORER: {
    CONSTRUCTION_1: 10,   // Faster research buildings
    MINING_1: 8,          // Resources for exploration
    AGRICULTURE_1: 7,     // Population support
    TRADE_1: 6,           // Trade networks
    MILITARY_1: 4,
  },
};

// Calculate resource efficiency score (how well we can afford something)
function calculateAffordabilityScore(cost: Record<string, number>, resources: Record<string, number>): number {
  let totalScore = 0;
  let totalCost = 0;
  
  for (const [resource, amount] of Object.entries(cost)) {
    const available = resources[resource.toLowerCase()] || 0;
    totalCost += amount;
    
    if (available >= amount * 2) {
      totalScore += 100; // We have plenty
    } else if (available >= amount) {
      totalScore += Math.floor((available / amount) * 50); // Marginal affordability
    } else {
      totalScore = 0; // Can't afford it
      break;
    }
  }
  
  return totalCost > 0 ? totalScore / Object.keys(cost).length : 0;
}

// Get current building level
function getBuildingLevel(buildings: Array<{ type: string; level: number }>, buildingType: string): number {
  const building = buildings.find(b => b.type === buildingType);
  return building?.level || 0;
}

// Check if a building is under construction
function isBuildingUnderConstruction(constructions: Array<{ buildingType: string }>, buildingType: string): boolean {
  return constructions.some(c => c.buildingType === buildingType);
}

// Check if research is already in progress
function isResearchInProgress(researches: Array<{ techKey: string }>, techKey: string): boolean {
  return researches.some(r => r.techKey === techKey);
}

// Main AI decision function
export function makeGovernorDecision(provinceState: ProvinceState, empireState: EmpireState): GovernorDecision {
  const { governor, resources, buildings, activeConstructions } = provinceState;
  const { activeResearches, totalResources } = empireState;
  
  // Loyalty affects decision making - low loyalty = less effective decisions
  const loyaltyModifier = Math.max(0.3, governor.loyalty / 100);
  
  // Experience affects decision quality - more XP = better decisions
  const experienceModifier = Math.min(1.5, 1 + (governor.xp / 1000));
  
  const buildingPriorities = PERSONALITY_BUILDING_PRIORITIES[governor.personality];
  const researchPriorities = PERSONALITY_RESEARCH_PRIORITIES[governor.personality];
  
  let bestDecision: GovernorDecision = { type: 'WAIT' };
  let bestScore = 0;
  
  // Evaluate building options
  for (const [buildingType, basePriority] of Object.entries(buildingPriorities)) {
    if (isBuildingUnderConstruction(activeConstructions, buildingType)) {
      continue; // Skip if already building
    }
    
    const currentLevel = getBuildingLevel(buildings, buildingType);
    
    // Check building requirements
    const buildingData = BUILDING_DATA[buildingType];
    if (buildingData?.requirements?.minLevel && currentLevel < buildingData.requirements.minLevel - 1) {
      continue; // Can't build yet
    }
    
    try {
      const { cost, time } = getBuildingUpgradeCost(buildingType, currentLevel);
      const affordabilityScore = calculateAffordabilityScore(cost, resources);
      
      if (affordabilityScore === 0) continue; // Can't afford
      
      // Calculate priority score
      let priorityScore = basePriority * loyaltyModifier * experienceModifier;
      
      // Bonus for first level of important buildings
      if (currentLevel === 0 && basePriority >= 8) {
        priorityScore *= 1.5;
      }
      
      // Penalty for very high levels (diminishing returns)
      if (currentLevel > 5) {
        priorityScore *= Math.pow(0.8, currentLevel - 5);
      }
      
      const finalScore = priorityScore * (affordabilityScore / 100);
      
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestDecision = {
          type: 'BUILD',
          action: {
            buildingType,
            reason: `${governor.personality.toLowerCase()}: ${buildingType.toLowerCase()} level ${currentLevel + 1} (Priority: ${basePriority}, Affordable: ${affordabilityScore.toFixed(1)}%)`,
            priority: Math.ceil(finalScore),
          },
        };
      }
    } catch (error) {
      // Skip invalid building types
      continue;
    }
  }
  
  // Evaluate research options (only if we have good resource situation)
  const resourceAbundance = Object.values(resources).reduce((sum, amount) => sum + amount, 0);
  if (resourceAbundance > 500) { // Only research if we have decent resources
    for (const [techKey, basePriority] of Object.entries(researchPriorities)) {
      if (isResearchInProgress(activeResearches, techKey)) {
        continue; // Skip if already researching
      }
      
      const tech = TECHNOLOGY_DATA[techKey];
      if (!tech) continue;
      
      // Check prerequisites
      if (tech.prerequisites?.some(prereq => !activeResearches.some(r => r.techKey === prereq))) {
        continue; // Prerequisites not met
      }
      
      const affordabilityScore = calculateAffordabilityScore(tech.cost, totalResources);
      if (affordabilityScore === 0) continue; // Can't afford
      
      let priorityScore = basePriority * loyaltyModifier * experienceModifier * 0.7; // Research is slightly less priority than building
      const finalScore = priorityScore * (affordabilityScore / 100);
      
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestDecision = {
          type: 'RESEARCH',
          action: {
            techKey,
            reason: `${governor.personality.toLowerCase()}: Research ${tech.name} (Priority: ${basePriority}, Affordable: ${affordabilityScore.toFixed(1)}%)`,
            priority: Math.ceil(finalScore),
          },
        };
      }
    }
  }
  
  return bestDecision;
}

// Generate governor report based on recent decisions and province state
export function generateGovernorReport(provinceState: ProvinceState, recentDecisions: GovernorDecision[]): string {
  const { governor, resources, buildings } = provinceState;
  const { personality, loyalty, name } = governor;
  
  const resourceTotal = Object.values(resources).reduce((sum, amount) => sum + amount, 0);
  const buildingCount = buildings.length;
  const avgBuildingLevel = buildings.length > 0 ? 
    buildings.reduce((sum, b) => sum + b.level, 0) / buildings.length : 0;
  
  let status = "";
  let suggestion = "";
  
  // Personality-specific reports
  switch (personality) {
    case 'CONSERVATIVE':
      if (resources['food'] > 1000) {
        status = "Food reserves are excellent. Provincial stability is high.";
      } else if (resources['food'] < 200) {
        status = "Food situation is concerning. Focusing on agricultural development.";
      } else {
        status = "Food production is stable. Maintaining steady growth.";
      }
      suggestion = "Recommends building defensive structures and maintaining food security.";
      break;
      
    case 'AGGRESSIVE':
      if (buildings.some(b => b.type === 'BARRACKS' && b.level > 2)) {
        status = "Military infrastructure is developing well. Ready for expansion.";
      } else {
        status = "Military capabilities need improvement. Prioritizing barracks construction.";
      }
      suggestion = "Suggests aggressive expansion and military buildup.";
      break;
      
    case 'MERCHANT':
      if (resources['gold'] > 2000) {
        status = "Trade is flourishing! Gold reserves are excellent.";
      } else if (resources['gold'] < 300) {
        status = "Economic situation needs attention. Focusing on gold production.";
      } else {
        status = "Trade networks are developing steadily.";
      }
      suggestion = "Advocates for marketplace expansion and trade route development.";
      break;
      
    case 'EXPLORER':
      if (buildings.some(b => b.type === 'ACADEMY' && b.level > 1)) {
        status = "Research capabilities are advancing. Knowledge expansion continues.";
      } else {
        status = "Seeking new knowledge and opportunities for advancement.";
      }
      suggestion = "Recommends investment in research and exploration technologies.";
      break;
  }
  
  // Add loyalty and experience context
  let loyaltyText = "";
  if (loyalty > 80) loyaltyText = "Extremely loyal and motivated.";
  else if (loyalty > 60) loyaltyText = "Loyal and reliable.";
  else if (loyalty > 40) loyaltyText = "Moderately loyal.";
  else loyaltyText = "Loyalty is wavering.";
  
  return `**${name} (${personality.toLowerCase()})**: ${status} ${suggestion} ${loyaltyText}`;
}

// Update governor experience based on successful decisions
export function updateGovernorExperience(governor: { xp: number }, decision: GovernorDecision): number {
  let xpGain = 0;
  
  if (decision.action) {
    // More XP for higher priority decisions
    xpGain = Math.floor((decision.action.priority || 1) * 10);
    
    // Bonus XP for different types of actions
    if (decision.type === 'BUILD') xpGain += 20;
    if (decision.type === 'RESEARCH') xpGain += 30;
  }
  
  return Math.min(10000, governor.xp + xpGain); // Cap at 10000 XP
}