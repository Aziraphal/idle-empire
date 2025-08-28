// Event system types for idle-empire
export type EventType = 
  | 'DISCOVERY'     // Positive resource finds
  | 'DISASTER'      // Natural disasters  
  | 'TRADE'         // Commerce opportunities
  | 'BARBARIAN'     // Hostile encounters
  | 'POLITICAL'     // Diplomatic events
  | 'ARTIFACT';     // Ancient discoveries

export type EventImpactType = 'IMMEDIATE' | 'TEMPORARY' | 'PERMANENT';

export interface EventChoice {
  id: string;
  text: string;
  description: string;
  cost?: Record<string, number>;
  requirements?: {
    minBuildings?: Record<string, number>;
    minResources?: Record<string, number>;
  };
  outcome: EventOutcome;
}

export interface EventOutcome {
  resources?: Record<string, number>;
  governorLoyalty?: number;
  governorXP?: number;
  message: string;
  followupEventChance?: number;
}

export interface GameEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  imageIcon: string;
  
  // Event mechanics
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'LEGENDARY';
  impactType: EventImpactType;
  duration?: number; // For temporary effects (hours)
  
  // Requirements
  requirements?: {
    minProvinces?: number;
    minBuildings?: Record<string, number>;
    minResources?: Record<string, number>;
    governorPersonality?: string[];
  };
  
  // Player choices
  choices: EventChoice[];
  
  // Meta info
  weight: number; // Spawn probability weight
}

export interface ActiveEvent {
  eventId: string;
  provinceId: string;
  triggeredAt: Date;
  expiresAt?: Date;
  resolved: boolean;
  chosenOutcome?: EventOutcome;
}

export interface TemporaryEffect {
  id: string;
  eventId: string;
  provinceId: string;
  type: 'RESOURCE_MULTIPLIER' | 'PRODUCTION_BONUS' | 'COST_REDUCTION';
  effect: Record<string, number>;
  expiresAt: Date;
}