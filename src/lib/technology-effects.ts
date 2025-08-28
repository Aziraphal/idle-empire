// Technology effects calculation system
import { TECHNOLOGY_DATA } from './timer-service';

// Map technology effect keys to bonus keys
function mapTechEffectToBonusKey(techEffectKey: string): string | null {
  const mapping: Record<string, string> = {
    'food_production': 'farmProduction',
    'gold_production': 'allProduction', // Will apply to all gold sources
    'iron_production': 'mineProduction',
    'construction_speed': 'constructionSpeed',
    'influence_production': 'influenceGeneration',
    'all_production': 'allProduction',
    'research_speed': 'researchSpeed',
    'population_growth': 'populationGrowth',
    'trade_bonus': 'tradeBonus',
  };
  
  return mapping[techEffectKey] || null;
}

export interface TechnologyBonus {
  // Production multipliers
  farmProduction: number;
  mineProduction: number;
  quarryProduction: number;
  marketplaceProduction: number;
  barracksEfficiency: number;
  academyEfficiency: number;
  
  // General bonuses
  allProduction: number;
  constructionSpeed: number;
  researchSpeed: number;
  
  // Combat bonuses
  combatBonus: number;
  raidDefense: number;
  navalPower: number;
  
  // Population and growth
  populationGrowth: number;
  populationCapacity: number;
  
  // Special bonuses
  tradeBonus: number;
  influenceGeneration: number;
  governorXpBonus: number;
  governorEfficiency: number;
  
  // Event modifiers
  plaguePrevention: number;
  combatCasualties: number;
  foodEvents: number;
  resourceEvents: number;
  magicalEvents: number;
  
  // Unlocks
  unlockAdvancedBuildings: boolean;
  monumentalProjects: boolean;
  economicVictory: boolean;
  militaryVictory: boolean;
  scientificVictory: boolean;
}

// Base bonuses (no technologies researched)
export const BASE_BONUSES: TechnologyBonus = {
  farmProduction: 1.0,
  mineProduction: 1.0,
  quarryProduction: 1.0,
  marketplaceProduction: 1.0,
  barracksEfficiency: 1.0,
  academyEfficiency: 1.0,
  
  allProduction: 1.0,
  constructionSpeed: 1.0,
  researchSpeed: 1.0,
  
  combatBonus: 1.0,
  raidDefense: 1.0,
  navalPower: 1.0,
  
  populationGrowth: 1.0,
  populationCapacity: 1.0,
  
  tradeBonus: 0.0,
  influenceGeneration: 1.0,
  governorXpBonus: 1.0,
  governorEfficiency: 1.0,
  
  plaguePrevention: 1.0,
  combatCasualties: 1.0,
  foodEvents: 1.0,
  resourceEvents: 1.0,
  magicalEvents: 1.0,
  
  unlockAdvancedBuildings: false,
  monumentalProjects: false,
  economicVictory: false,
  militaryVictory: false,
  scientificVictory: false,
};

// Calculate total technology bonuses from researched technologies
export function calculateTechnologyBonuses(researchedTechnologies: string[]): TechnologyBonus {
  const bonuses = { ...BASE_BONUSES };
  
  // Apply each researched technology's effects
  researchedTechnologies.forEach(techKey => {
    const tech = TECHNOLOGY_DATA[techKey];
    if (!tech) return;
    
    // Apply multiplicative effects (these stack multiplicatively)
    const multiplicativeEffects = [
      'farmProduction', 'mineProduction', 'quarryProduction', 'marketplaceProduction',
      'barracksEfficiency', 'academyEfficiency', 'allProduction', 'constructionSpeed',
      'researchSpeed', 'combatBonus', 'raidDefense', 'navalPower', 'populationGrowth',
      'populationCapacity', 'influenceGeneration', 'governorXpBonus', 'governorEfficiency',
      'alchemicalProduction', 'buildingCapacity', 'militaryEfficiency'
    ];
    
    // Apply additive effects (these add to the base)
    const additiveEffects = ['tradeBonus'];
    
    // Apply reduction effects (these multiply toward 0)
    const reductionEffects = ['plaguePrevention', 'combatCasualties'];
    
    // Apply event bonus effects
    const eventEffects = ['foodEvents', 'resourceEvents', 'magicalEvents'];
    
    if (tech.effects.modifiers) {
      Object.entries(tech.effects.modifiers).forEach(([effectKey, effectValue]) => {
        if (typeof effectValue === 'number') {
          // Map from tech effect keys to bonus keys
          const bonusKey = mapTechEffectToBonusKey(effectKey);
          if (bonusKey && bonusKey in bonuses) {
            if (multiplicativeEffects.includes(bonusKey)) {
              // Multiplicative stacking: 1.2 * 1.3 = 1.56
              (bonuses as any)[bonusKey] *= effectValue;
            } else if (additiveEffects.includes(bonusKey)) {
              // Additive stacking: 0.1 + 0.2 = 0.3
              (bonuses as any)[bonusKey] += effectValue;
            } else if (reductionEffects.includes(bonusKey)) {
              // Reduction stacking: 0.8 * 0.7 = 0.56 (more reduction)
              (bonuses as any)[bonusKey] *= effectValue;
            } else if (eventEffects.includes(bonusKey)) {
              // Event bonuses stack multiplicatively
              (bonuses as any)[bonusKey] *= effectValue;
            }
          }
        }
      });
    }
  });
  
  // Handle special cross-technology synergies
  const hasSynergies = checkTechnologySynergies(researchedTechnologies);
  
  // Synergy: Agriculture + Medicine = Extra population growth
  if (hasSynergies.agricultureMedicine) {
    bonuses.populationGrowth *= 1.2; // +20% bonus synergy
  }
  
  // Synergy: Military + Engineering = Better fortifications
  if (hasSynergies.militaryEngineering) {
    bonuses.raidDefense *= 1.3; // +30% bonus synergy
  }
  
  // Synergy: Trade + Scholarship = Cultural influence
  if (hasSynergies.tradeScholarship) {
    bonuses.influenceGeneration *= 1.25; // +25% bonus synergy
  }
  
  // Synergy: All Tier 1 techs = General efficiency bonus
  if (hasSynergies.allTier1) {
    bonuses.allProduction *= 1.1; // +10% bonus for completing tier 1
  }
  
  // Synergy: All economic techs = Super economy
  if (hasSynergies.economicMastery) {
    bonuses.tradeBonus += 0.15; // +15% additional trade bonus
    bonuses.allProduction *= 1.2; // +20% all production
  }
  
  return bonuses;
}

// Check for technology synergies
function checkTechnologySynergies(researchedTechs: string[]): Record<string, boolean> {
  const hasAllTier1 = ['AGRICULTURE_1', 'MINING_1', 'CONSTRUCTION_1', 'TRADE_1', 'MILITARY_1']
    .every(tech => researchedTechs.includes(tech));
  
  const hasEconomicMastery = ['AGRICULTURE_3', 'INDUSTRIAL_MINING', 'EMPIRE_TRADE']
    .every(tech => researchedTechs.includes(tech));
  
  return {
    agricultureMedicine: researchedTechs.includes('AGRICULTURE_2') && researchedTechs.includes('MEDICINE'),
    militaryEngineering: researchedTechs.includes('MILITARY_2') && researchedTechs.includes('ENGINEERING'),
    tradeScholarship: researchedTechs.includes('TRADE_2') && researchedTechs.includes('SCHOLARSHIP'),
    allTier1: hasAllTier1,
    economicMastery: hasEconomicMastery,
  };
}

// Apply technology bonuses to base production rates
export function applyTechnologyBonuses(
  baseProduction: Record<string, number>,
  buildingType: string,
  bonuses: TechnologyBonus
): Record<string, number> {
  const modifiedProduction = { ...baseProduction };
  
  // Apply building-specific bonuses
  let buildingMultiplier = 1.0;
  
  switch (buildingType) {
    case 'FARM':
      buildingMultiplier = bonuses.farmProduction;
      break;
    case 'MINE':
      buildingMultiplier = bonuses.mineProduction;
      break;
    case 'QUARRY':
      buildingMultiplier = bonuses.quarryProduction;
      break;
    case 'MARKETPLACE':
      buildingMultiplier = bonuses.marketplaceProduction;
      break;
    case 'BARRACKS':
      buildingMultiplier = bonuses.barracksEfficiency;
      break;
    case 'ACADEMY':
      buildingMultiplier = bonuses.academyEfficiency;
      break;
  }
  
  // Apply bonuses to each resource
  Object.keys(modifiedProduction).forEach(resource => {
    // Apply building-specific bonus
    modifiedProduction[resource] *= buildingMultiplier;
    
    // Apply general production bonus
    modifiedProduction[resource] *= bonuses.allProduction;
    
    // Apply trade bonus (affects all positive production)
    if (modifiedProduction[resource] > 0) {
      modifiedProduction[resource] *= (1 + bonuses.tradeBonus);
    }
  });
  
  return modifiedProduction;
}

// Get available technologies for research (prerequisites met)
export function getAvailableTechnologies(
  researchedTechnologies: string[]
): Array<{ key: string; tech: typeof TECHNOLOGY_DATA[string] }> {
  const available = [];
  
  for (const [techKey, tech] of Object.entries(TECHNOLOGY_DATA)) {
    // Skip if already researched
    if (researchedTechnologies.includes(techKey)) continue;
    
    // Check if prerequisites are met
    const prerequisitesMet = !tech.prerequisites || 
      tech.prerequisites.every(prereq => researchedTechnologies.includes(prereq));
    
    if (prerequisitesMet) {
      available.push({ key: techKey, tech });
    }
  }
  
  // Sort by tier, then by category
  return available.sort((a, b) => {
    if (a.tech.tier !== b.tech.tier) {
      return a.tech.tier - b.tech.tier;
    }
    return a.tech.category.localeCompare(b.tech.category);
  });
}

// Calculate research cost with bonuses
export function calculateResearchCost(
  techKey: string,
  bonuses: TechnologyBonus
): { cost: Record<string, number>; timeHours: number } {
  const tech = TECHNOLOGY_DATA[techKey];
  if (!tech) {
    throw new Error(`Unknown technology: ${techKey}`);
  }
  
  return {
    cost: { ...tech.cost },
    timeHours: Math.ceil(tech.researchTime / bonuses.researchSpeed)
  };
}

// Get technology tree visualization data
export function getTechnologyTree(): Array<{
  tier: number;
  category: string;
  technologies: Array<{
    key: string;
    tech: typeof TECHNOLOGY_DATA[string];
    prerequisites: string[];
  }>;
}> {
  const tree: Record<number, Record<string, Array<{ key: string; tech: typeof TECHNOLOGY_DATA[string]; prerequisites: string[] }>>> = {};
  
  // Group technologies by tier and category
  Object.entries(TECHNOLOGY_DATA).forEach(([key, tech]) => {
    if (!tree[tech.tier]) tree[tech.tier] = {};
    if (!tree[tech.tier][tech.category]) tree[tech.tier][tech.category] = [];
    
    tree[tech.tier][tech.category].push({
      key,
      tech,
      prerequisites: tech.prerequisites || []
    });
  });
  
  // Convert to array format
  const result = [];
  for (const [tier, categories] of Object.entries(tree)) {
    for (const [category, technologies] of Object.entries(categories)) {
      result.push({
        tier: parseInt(tier),
        category,
        technologies
      });
    }
  }
  
  return result.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.category.localeCompare(b.category);
  });
}