// Active Skills Data and Configuration

export interface SkillData {
  key: string;
  name: string;
  description: string;
  category: "ECONOMY" | "MILITARY" | "MAGIC" | "UTILITY" | "ULTIMATE";
  type: "INSTANT" | "TOGGLE" | "CHANNELED" | "PASSIVE";
  
  // Requirements
  requiredLevel: number;
  requiredTechs: string[];
  prerequisites: string[];
  
  // Costs and Cooldowns
  cooldownSeconds: number;
  energyCost: number;
  manaCost: number;
  resourceCosts: Record<string, number>;
  
  // Effects
  effects: {
    type: string;
    value: number;
    duration?: number;
    target?: string;
    [key: string]: any;
  }[];
  duration: number;
  maxLevel: number;
  
  // UI
  icon: string;
  color: string;
}

// Base Active Skills Database
export const SKILL_DATA: Record<string, SkillData> = {
  // ECONOMY SKILLS
  "HARVEST_BOOST": {
    key: "HARVEST_BOOST",
    name: "Harvest Blessing",
    description: "Dramatically boost resource production in all provinces for 5 minutes",
    category: "ECONOMY",
    type: "INSTANT",
    requiredLevel: 5,
    requiredTechs: ["AGRICULTURE_2"],
    prerequisites: [],
    cooldownSeconds: 300, // 5 minutes
    energyCost: 20,
    manaCost: 0,
    resourceCosts: {},
    effects: [
      {
        type: "PRODUCTION_MULTIPLIER",
        value: 2.5,
        duration: 300,
        target: "ALL_PROVINCES"
      }
    ],
    duration: 300,
    maxLevel: 5,
    icon: "🌾",
    color: "text-green-400"
  },

  "INSTANT_COLLECT": {
    key: "INSTANT_COLLECT",
    name: "Instant Collection",
    description: "Immediately collect 2 hours worth of resources from all provinces",
    category: "ECONOMY", 
    type: "INSTANT",
    requiredLevel: 8,
    requiredTechs: ["TRADE_1"],
    prerequisites: [],
    cooldownSeconds: 600, // 10 minutes
    energyCost: 30,
    manaCost: 0,
    resourceCosts: { gold: 100 },
    effects: [
      {
        type: "INSTANT_PRODUCTION",
        value: 2, // hours
        target: "ALL_PROVINCES"
      }
    ],
    duration: 0,
    maxLevel: 3,
    icon: "⚡",
    color: "text-yellow-400"
  },

  "MARKET_MANIPULATION": {
    key: "MARKET_MANIPULATION",
    name: "Market Manipulation",
    description: "Reduce all construction and research costs by 30% for 10 minutes",
    category: "ECONOMY",
    type: "INSTANT",
    requiredLevel: 12,
    requiredTechs: ["TRADE_1", "SCHOLARSHIP"],
    prerequisites: ["INSTANT_COLLECT"],
    cooldownSeconds: 900, // 15 minutes
    energyCost: 40,
    manaCost: 10,
    resourceCosts: { gold: 200, influence: 50 },
    effects: [
      {
        type: "COST_REDUCTION",
        value: 0.3, // 30% reduction
        duration: 600,
        target: "ALL_ACTIONS"
      }
    ],
    duration: 600,
    maxLevel: 3,
    icon: "💰",
    color: "text-green-400"
  },

  // MILITARY SKILLS
  "BATTLE_FURY": {
    key: "BATTLE_FURY",
    name: "Battle Fury",
    description: "Next combat has +50% damage and +25% defense for 30 seconds",
    category: "MILITARY",
    type: "INSTANT",
    requiredLevel: 10,
    requiredTechs: ["MILITARY_2"],
    prerequisites: [],
    cooldownSeconds: 180, // 3 minutes
    energyCost: 25,
    manaCost: 0,
    resourceCosts: { influence: 20 },
    effects: [
      {
        type: "COMBAT_BUFF",
        value: 1.5, // 50% damage boost
        duration: 30,
        target: "NEXT_COMBAT"
      },
      {
        type: "DEFENSE_BUFF", 
        value: 1.25, // 25% defense boost
        duration: 30,
        target: "NEXT_COMBAT"
      }
    ],
    duration: 30,
    maxLevel: 4,
    icon: "⚔️",
    color: "text-red-400"
  },

  "RALLY_TROOPS": {
    key: "RALLY_TROOPS",
    name: "Rally the Troops",
    description: "Instantly complete current military construction and boost next 3 military builds",
    category: "MILITARY",
    type: "INSTANT", 
    requiredLevel: 15,
    requiredTechs: ["MILITARY_2", "ENGINEERING"],
    prerequisites: ["BATTLE_FURY"],
    cooldownSeconds: 1200, // 20 minutes
    energyCost: 50,
    manaCost: 0,
    resourceCosts: { gold: 300, influence: 100 },
    effects: [
      {
        type: "COMPLETE_MILITARY_CONSTRUCTION",
        value: 1,
        target: "CURRENT"
      },
      {
        type: "MILITARY_BUILD_BOOST",
        value: 0.5, // 50% faster
        duration: 1800, // 30 minutes
        target: "NEXT_3_BUILDS"
      }
    ],
    duration: 0,
    maxLevel: 2,
    icon: "🏰",
    color: "text-red-400"
  },

  // MAGIC SKILLS
  "MANA_SURGE": {
    key: "MANA_SURGE",
    name: "Mana Surge",
    description: "Instantly restore 50 Mana and increase Mana regeneration by 100% for 5 minutes",
    category: "MAGIC",
    type: "INSTANT",
    requiredLevel: 8,
    requiredTechs: ["ALCHEMY"],
    prerequisites: [],
    cooldownSeconds: 240, // 4 minutes
    energyCost: 0,
    manaCost: 0,
    resourceCosts: { gold: 50 },
    effects: [
      {
        type: "RESTORE_MANA",
        value: 50,
        target: "SELF"
      },
      {
        type: "MANA_REGEN_BOOST",
        value: 2, // 100% increase (double)
        duration: 300,
        target: "SELF"
      }
    ],
    duration: 300,
    maxLevel: 3,
    icon: "✨",
    color: "text-purple-400"
  },

  "ENCHANT_BUILDINGS": {
    key: "ENCHANT_BUILDINGS",
    name: "Enchant Buildings", 
    description: "Enchant all buildings in a province for +75% efficiency for 15 minutes",
    category: "MAGIC",
    type: "INSTANT",
    requiredLevel: 20,
    requiredTechs: ["ENCHANTMENT"],
    prerequisites: ["MANA_SURGE"],
    cooldownSeconds: 1800, // 30 minutes
    energyCost: 0,
    manaCost: 80,
    resourceCosts: { gold: 500 },
    effects: [
      {
        type: "BUILDING_ENCHANTMENT",
        value: 1.75, // 75% efficiency boost
        duration: 900, // 15 minutes
        target: "SELECTED_PROVINCE"
      }
    ],
    duration: 900,
    maxLevel: 3,
    icon: "🔮",
    color: "text-purple-400"
  },

  // UTILITY SKILLS
  "TIME_ACCELERATION": {
    key: "TIME_ACCELERATION",
    name: "Time Acceleration",
    description: "Speed up all construction and research by 300% for 2 minutes",
    category: "UTILITY",
    type: "INSTANT",
    requiredLevel: 18,
    requiredTechs: ["ARCANE_RESEARCH"],
    prerequisites: [],
    cooldownSeconds: 2400, // 40 minutes
    energyCost: 60,
    manaCost: 100,
    resourceCosts: { gold: 1000, influence: 200 },
    effects: [
      {
        type: "TIME_MULTIPLIER", 
        value: 4, // 300% faster (4x speed)
        duration: 120, // 2 minutes
        target: "ALL_TASKS"
      }
    ],
    duration: 120,
    maxLevel: 2,
    icon: "⏰",
    color: "text-blue-400"
  },

  "DIVINE_INSIGHT": {
    key: "DIVINE_INSIGHT",
    name: "Divine Insight",
    description: "Reveal all hidden events and bonuses in the next 3 exploration attempts",
    category: "UTILITY",
    type: "INSTANT",
    requiredLevel: 12,
    requiredTechs: ["SCHOLARSHIP"],
    prerequisites: [],
    cooldownSeconds: 720, // 12 minutes
    energyCost: 35,
    manaCost: 25,
    resourceCosts: { influence: 75 },
    effects: [
      {
        type: "EXPLORATION_INSIGHT",
        value: 3, // affects next 3 explorations
        target: "EXPLORATION"
      },
      {
        type: "REVEAL_SECRETS",
        value: 1,
        target: "HIDDEN_EVENTS"
      }
    ],
    duration: 0,
    maxLevel: 3,
    icon: "👁️",
    color: "text-blue-400"
  },

  // ULTIMATE SKILLS
  "EMPIRE_ASCENSION": {
    key: "EMPIRE_ASCENSION",
    name: "Empire Ascension",
    description: "ULTIMATE: Boost ALL empire activities by 500% for 1 minute. Long cooldown.",
    category: "ULTIMATE",
    type: "INSTANT",
    requiredLevel: 25,
    requiredTechs: ["ARCANE_RESEARCH", "MILITARY_2", "TRADE_1"],
    prerequisites: ["TIME_ACCELERATION", "ENCHANT_BUILDINGS", "RALLY_TROOPS"],
    cooldownSeconds: 7200, // 2 hours
    energyCost: 100,
    manaCost: 200,
    resourceCosts: { 
      gold: 5000, 
      food: 1000, 
      stone: 1000, 
      iron: 1000, 
      influence: 500 
    },
    effects: [
      {
        type: "ULTIMATE_BOOST",
        value: 6, // 500% boost (6x multiplier)
        duration: 60, // 1 minute
        target: "ENTIRE_EMPIRE"
      }
    ],
    duration: 60,
    maxLevel: 1,
    icon: "👑",
    color: "text-yellow-300"
  }
};

// Skill Categories for UI organization
export const SKILL_CATEGORIES = {
  ECONOMY: {
    name: "Economic",
    icon: "💰",
    color: "text-green-400",
    description: "Resource production and economic bonuses"
  },
  MILITARY: {
    name: "Military", 
    icon: "⚔️",
    color: "text-red-400",
    description: "Combat bonuses and military construction"
  },
  MAGIC: {
    name: "Magical",
    icon: "✨",
    color: "text-purple-400",
    description: "Mana-based abilities and enchantments"
  },
  UTILITY: {
    name: "Utility",
    icon: "🔧",
    color: "text-blue-400", 
    description: "Time manipulation and exploration bonuses"
  },
  ULTIMATE: {
    name: "Ultimate",
    icon: "👑",
    color: "text-yellow-300",
    description: "Powerful empire-wide abilities"
  }
};

// Calculate skill effects based on level
export function getSkillEffects(skillKey: string, level: number) {
  const baseSkill = SKILL_DATA[skillKey];
  if (!baseSkill) return null;

  // Scale effects based on level
  const scaledEffects = baseSkill.effects.map(effect => ({
    ...effect,
    value: effect.value * (1 + (level - 1) * 0.25) // 25% increase per level
  }));

  return {
    ...baseSkill,
    effects: scaledEffects,
    cooldownSeconds: Math.max(baseSkill.cooldownSeconds * (1 - (level - 1) * 0.1), baseSkill.cooldownSeconds * 0.5), // 10% cooldown reduction per level, min 50%
    energyCost: Math.max(baseSkill.energyCost * (1 - (level - 1) * 0.05), baseSkill.energyCost * 0.7) // 5% cost reduction per level, min 70%
  };
}

// Check if player meets skill requirements
export function checkSkillRequirements(
  skillKey: string,
  playerLevel: number,
  unlockedTechs: string[],
  unlockedSkills: string[]
) {
  const skill = SKILL_DATA[skillKey];
  if (!skill) return { canUnlock: false, missingRequirements: ["Skill not found"] };

  const missingRequirements: string[] = [];

  // Level requirement
  if (playerLevel < skill.requiredLevel) {
    missingRequirements.push(`Level ${skill.requiredLevel} required`);
  }

  // Technology requirements
  for (const requiredTech of skill.requiredTechs) {
    if (!unlockedTechs.includes(requiredTech)) {
      missingRequirements.push(`Technology: ${requiredTech}`);
    }
  }

  // Skill prerequisites
  for (const prerequisite of skill.prerequisites) {
    if (!unlockedSkills.includes(prerequisite)) {
      const prereqSkill = SKILL_DATA[prerequisite];
      missingRequirements.push(`Skill: ${prereqSkill?.name || prerequisite}`);
    }
  }

  return {
    canUnlock: missingRequirements.length === 0,
    missingRequirements
  };
}