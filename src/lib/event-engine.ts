// Event engine for generating and processing random events
import { GAME_EVENTS, RARITY_WEIGHTS } from './event-data';
import { GameEvent } from '@/types/events';
import { GovernorPersonality } from '@prisma/client';

export interface ProvinceContext {
  id: string;
  name: string;
  level: number;
  threat: number;
  buildings: Array<{ type: string; level: number }>;
  resources: Record<string, number>;
  governor: {
    personality: GovernorPersonality;
    loyalty: number;
    xp: number;
  } | null;
}

export interface EmpireContext {
  totalProvinces: number;
  totalResources: Record<string, number>;
}

// Calculate event spawn chance based on various factors
export function calculateEventChance(province: ProvinceContext, empire: EmpireContext): number {
  let baseChance = 0.15; // 15% base chance per check
  
  // Province factors
  if (province.level > 3) baseChance += 0.05;
  if (province.threat > 5) baseChance += 0.1; // Higher threat = more events
  
  // Governor personality influences
  if (province.governor) {
    switch (province.governor.personality) {
      case 'EXPLORER':
        baseChance += 0.1; // Explorers find more events
        break;
      case 'AGGRESSIVE':
        baseChance += 0.05; // Aggressive actions attract attention
        break;
      case 'CONSERVATIVE':
        baseChance -= 0.03; // Conservative approach reduces risk
        break;
    }
  }
  
  // Empire size factor
  if (empire.totalProvinces > 3) baseChance += 0.08;
  
  return Math.min(0.4, baseChance); // Cap at 40%
}

// Filter events based on requirements
export function getEligibleEvents(province: ProvinceContext, empire: EmpireContext): GameEvent[] {
  return Object.values(GAME_EVENTS).filter(event => {
    if (!event.requirements) return true;
    
    const req = event.requirements;
    
    // Check minimum provinces
    if (req.minProvinces && empire.totalProvinces < req.minProvinces) {
      return false;
    }
    
    // Check building requirements
    if (req.minBuildings) {
      for (const [buildingType, minLevel] of Object.entries(req.minBuildings)) {
        const building = province.buildings.find(b => b.type === buildingType);
        if (!building || building.level < minLevel) {
          return false;
        }
      }
    }
    
    // Check resource requirements
    if (req.minResources) {
      for (const [resource, minAmount] of Object.entries(req.minResources)) {
        if ((province.resources[resource.toLowerCase()] || 0) < minAmount) {
          return false;
        }
      }
    }
    
    // Check governor personality requirements
    if (req.governorPersonality) {
      if (!province.governor || !req.governorPersonality.includes(province.governor.personality)) {
        return false;
      }
    }
    
    return true;
  });
}

// Select a random event weighted by rarity and event weight
export function selectRandomEvent(eligibleEvents: GameEvent[]): GameEvent | null {
  if (eligibleEvents.length === 0) return null;
  
  // Calculate weighted pool
  const weightedEvents = eligibleEvents.map(event => ({
    event,
    weight: event.weight * RARITY_WEIGHTS[event.rarity]
  }));
  
  const totalWeight = weightedEvents.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return null;
  
  // Random selection
  let random = Math.random() * totalWeight;
  
  for (const item of weightedEvents) {
    random -= item.weight;
    if (random <= 0) {
      return item.event;
    }
  }
  
  // Fallback to last event (shouldn't happen)
  return weightedEvents[weightedEvents.length - 1]?.event || null;
}

// Check if player can afford event choice cost
export function canAffordChoice(
  choiceId: string, 
  event: GameEvent, 
  provinceResources: Record<string, number>
): { canAfford: boolean; missingResources?: Array<{ resource: string; needed: number; have: number }> } {
  const choice = event.choices.find(c => c.id === choiceId);
  if (!choice || !choice.cost) {
    return { canAfford: true };
  }
  
  const missingResources = [];
  
  for (const [resource, cost] of Object.entries(choice.cost)) {
    const available = provinceResources[resource.toLowerCase()] || 0;
    if (available < cost) {
      missingResources.push({
        resource,
        needed: cost,
        have: available
      });
    }
  }
  
  return {
    canAfford: missingResources.length === 0,
    missingResources: missingResources.length > 0 ? missingResources : undefined
  };
}

// Process event choice and return outcomes
export function processEventChoice(
  choiceId: string,
  event: GameEvent,
  province: ProvinceContext
): {
  resourceChanges: Record<string, number>;
  governorLoyaltyChange: number;
  governorXpGain: number;
  message: string;
  scheduleFollowup: boolean;
  temporaryEffect?: {
    type: string;
    effect: Record<string, number>;
    duration: number;
  };
} {
  const choice = event.choices.find(c => c.id === choiceId);
  if (!choice) {
    throw new Error(`Invalid choice ID: ${choiceId}`);
  }
  
  const outcome = choice.outcome;
  
  // Calculate resource changes (including costs)
  const resourceChanges: Record<string, number> = {};
  
  // Apply costs (negative)
  if (choice.cost) {
    for (const [resource, cost] of Object.entries(choice.cost)) {
      resourceChanges[resource.toLowerCase()] = (resourceChanges[resource.toLowerCase()] || 0) - cost;
    }
  }
  
  // Apply gains (positive)
  if (outcome.resources) {
    for (const [resource, gain] of Object.entries(outcome.resources)) {
      resourceChanges[resource.toLowerCase()] = (resourceChanges[resource.toLowerCase()] || 0) + gain;
    }
  }
  
  // Prepare temporary effect if event has duration
  let temporaryEffect;
  if (event.impactType === 'TEMPORARY' && event.duration) {
    // This would be expanded based on specific event logic
    // For now, we'll handle it in the specific event processing
  }
  
  return {
    resourceChanges,
    governorLoyaltyChange: outcome.governorLoyalty || 0,
    governorXpGain: outcome.governorXP || 0,
    message: outcome.message,
    scheduleFollowup: (outcome.followupEventChance || 0) > Math.random(),
    temporaryEffect
  };
}

// Generate event instance data for database storage
export function createEventInstance(event: GameEvent, provinceId: string) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Events expire after 24 hours if not resolved
  
  return {
    provinceId,
    eventKey: event.id,
    type: event.type as any,
    rarity: event.rarity as any,
    title: event.title,
    description: event.description,
    imageIcon: event.imageIcon,
    expiresAt: event.impactType === 'IMMEDIATE' ? null : expiresAt,
    resolved: event.impactType === 'IMMEDIATE', // Immediate events are auto-resolved
  };
}