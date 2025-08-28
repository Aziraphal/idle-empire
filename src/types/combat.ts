// Combat system types for idle-empire
export type EnemyType = 
  | 'BARBARIAN_SCOUTS'   // Light raiding party
  | 'BARBARIAN_WARRIORS' // Medium raiding force  
  | 'BARBARIAN_HORDE'    // Large organized attack
  | 'BEAST_PACK'         // Wild animals
  | 'RIVAL_SPIES'        // Espionage attempts
  | 'BANDIT_GANG'        // Resource thieves
  | 'CULTIST_SECT';      // Mystical threat

export type CombatOutcome = 'VICTORY' | 'DEFEAT' | 'DRAW';

export interface EnemyForce {
  id: string;
  type: EnemyType;
  name: string;
  description: string;
  icon: string;
  
  // Combat stats
  strength: number;     // 1-100 attack power
  toughness: number;    // 1-100 defense/HP
  speed: number;        // 1-100 initiative  
  cunning: number;      // 1-100 special tactics
  
  // Threat level
  threatLevel: number;  // 1-10 difficulty
  minProvinceLevel: number; // Won't attack weak provinces
  
  // Loot and consequences
  victoryRewards: Record<string, number>;   // Resources gained on victory
  defeatPenalties: Record<string, number>;  // Resources lost on defeat
  
  // Spawn conditions
  spawnWeight: number;  // Probability weight
  requirements?: {
    minThreat?: number;
    maxThreat?: number;
    nearResources?: string[]; // Attracted by specific resources
    seasonality?: number;     // Time-based spawning
  };
}

export interface DefenseForce {
  // Base province defenses
  wallLevel: number;        // From building upgrades
  garrisonSize: number;     // From barracks
  watchtowers: number;      // Early warning systems
  
  // Military buildings effectiveness
  barracksBonus: number;    // Training and equipment
  smithyBonus: number;      // Weapon quality
  stableBonus: number;      // Cavalry units
  
  // Governor military leadership
  governorBonus: number;    // Leadership and tactics
  governorPersonality: string; // Combat approach
  governorLoyalty: number;  // Affects performance
  
  // Population militia
  militiaSize: number;      // Civilian defenders
  populationMorale: number; // Willingness to fight
  
  // Temporary bonuses
  recentVictories: number;  // Confidence boost
  strategicReserves: number; // Saved resources for defense
}

export interface CombatResult {
  outcome: CombatOutcome;
  victoryCertainty: number; // 0-1, how decisive the victory
  
  // Casualties and damage
  defenderCasualties: number;
  enemyCasualties: number;
  infrastructureDamage: number;
  
  // Resource changes
  resourcesGained: Record<string, number>;
  resourcesLost: Record<string, number>;
  
  // Experience and effects
  governorXpGain: number;
  governorLoyaltyChange: number;
  populationMoraleChange: number;
  
  // Narrative
  battleReport: string;
  consequenceReport?: string; // Long-term effects
}

export interface RaidEvent {
  id: string;
  provinceId: string;
  enemyForce: EnemyForce;
  
  // Timing
  detectedAt: Date;       // When scouts spotted the enemy
  arrivalTime: Date;      // When combat begins
  preparationTime: number; // Minutes to prepare defenses
  
  // Player choices
  strategy?: 'DEFEND' | 'EVACUATE' | 'SALLY_FORTH' | 'NEGOTIATE';
  reinforcementsRequested?: boolean;
  resourcesCommitted?: Record<string, number>;
  
  // Resolution
  resolved: boolean;
  combatResult?: CombatResult;
  playerChoiceMade: boolean;
}

// Combat calculation parameters
export interface CombatFactors {
  // Numeric modifiers
  strengthRatio: number;    // Attacker vs Defender strength
  terrainBonus: number;     // Defensive terrain advantage  
  preparationBonus: number; // Time to prepare defenses
  leadershipBonus: number;  // Governor military skill
  moraleBonus: number;      // Population willingness to fight
  equipmentBonus: number;   // Weapon and armor quality
  tacticalBonus: number;    // Special strategies and tricks
  
  // Random factors
  weatherEffect: number;    // Environmental conditions
  luckFactor: number;       // Battlefield chaos and fortune
  surpriseFactor: number;   // Unexpected developments
}