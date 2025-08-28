// Enemy database for combat system
import { EnemyForce, EnemyType } from '@/types/combat';

export const ENEMY_FORCES: Record<string, EnemyForce> = {
  // === BARBARIAN THREATS ===
  BARBARIAN_SCOUTS: {
    id: 'BARBARIAN_SCOUTS',
    type: 'BARBARIAN_SCOUTS',
    name: 'Barbarian Scout Party',
    description: 'A small group of barbarian scouts testing your defenses. They move quickly but lack heavy equipment.',
    icon: '🏹',
    
    strength: 25,
    toughness: 20,
    speed: 80,
    cunning: 40,
    
    threatLevel: 2,
    minProvinceLevel: 1,
    
    victoryRewards: {
      gold: 150,
      iron: 50,
      influence: 25
    },
    defeatPenalties: {
      food: -300,
      gold: -200,
      population: -20
    },
    
    spawnWeight: 25,
    requirements: {
      minThreat: 5,
      maxThreat: 30
    }
  },

  BARBARIAN_RAIDERS: {
    id: 'BARBARIAN_RAIDERS',
    type: 'BARBARIAN_WARRIORS',
    name: 'Barbarian Raiding Party',
    description: 'Seasoned barbarian warriors seeking plunder. They are well-armed and experienced in combat.',
    icon: '⚔️',
    
    strength: 55,
    toughness: 50,
    speed: 60,
    cunning: 65,
    
    threatLevel: 5,
    minProvinceLevel: 2,
    
    victoryRewards: {
      gold: 400,
      iron: 150,
      stone: 100,
      influence: 75
    },
    defeatPenalties: {
      food: -600,
      gold: -500,
      stone: -200,
      population: -50,
      influence: -30
    },
    
    spawnWeight: 15,
    requirements: {
      minThreat: 15,
      maxThreat: 60,
      nearResources: ['gold', 'iron']
    }
  },

  BARBARIAN_WARBAND: {
    id: 'BARBARIAN_WARBAND',
    type: 'BARBARIAN_HORDE',
    name: 'Barbarian Warband',
    description: 'A massive barbarian horde led by a fearsome chieftain. They bring siege equipment and overwhelming numbers.',
    icon: '🛡️',
    
    strength: 85,
    toughness: 75,
    speed: 40,
    cunning: 55,
    
    threatLevel: 8,
    minProvinceLevel: 3,
    
    victoryRewards: {
      gold: 1000,
      iron: 400,
      stone: 300,
      influence: 200,
      population: 30 // Freed prisoners
    },
    defeatPenalties: {
      food: -1200,
      gold: -800,
      stone: -500,
      iron: -300,
      population: -100,
      influence: -75
    },
    
    spawnWeight: 5,
    requirements: {
      minThreat: 40,
      nearResources: ['gold', 'population']
    }
  },

  // === BEAST THREATS ===
  WOLF_PACK: {
    id: 'WOLF_PACK',
    type: 'BEAST_PACK',
    name: 'Dire Wolf Pack',
    description: 'A pack of unnaturally large wolves, driven from their territory by expanding settlements.',
    icon: '🐺',
    
    strength: 40,
    toughness: 35,
    speed: 90,
    cunning: 70,
    
    threatLevel: 3,
    minProvinceLevel: 1,
    
    victoryRewards: {
      food: 200,
      iron: 25, // Salvaged weapons
      influence: 15
    },
    defeatPenalties: {
      food: -400,
      population: -30,
      gold: -100 // Livestock losses
    },
    
    spawnWeight: 20,
    requirements: {
      minThreat: 10,
      maxThreat: 40,
      nearResources: ['food']
    }
  },

  SHADOW_BEASTS: {
    id: 'SHADOW_BEASTS',
    type: 'BEAST_PACK',
    name: 'Shadow Beast Incursion',
    description: 'Mysterious creatures from the dark places of the world, attracted by magical energy.',
    icon: '👹',
    
    strength: 65,
    toughness: 60,
    speed: 75,
    cunning: 85,
    
    threatLevel: 6,
    minProvinceLevel: 2,
    
    victoryRewards: {
      influence: 150,
      gold: 300, // Magical components
      iron: 100
    },
    defeatPenalties: {
      population: -60,
      influence: -50,
      food: -300
    },
    
    spawnWeight: 8,
    requirements: {
      minThreat: 20,
      nearResources: ['influence'] // Attracted to magical activities
    }
  },

  // === HUMAN THREATS ===
  BANDIT_GANG: {
    id: 'BANDIT_GANG',
    type: 'BANDIT_GANG',
    name: 'Desperate Bandits',
    description: 'A group of desperate outlaws seeking easy targets. They prefer quick strikes over prolonged battles.',
    icon: '🔪',
    
    strength: 35,
    toughness: 25,
    speed: 70,
    cunning: 80,
    
    threatLevel: 3,
    minProvinceLevel: 1,
    
    victoryRewards: {
      gold: 250,
      iron: 75,
      influence: 20
    },
    defeatPenalties: {
      gold: -400,
      food: -200,
      stone: -150
    },
    
    spawnWeight: 18,
    requirements: {
      minThreat: 8,
      maxThreat: 35,
      nearResources: ['gold']
    }
  },

  RIVAL_SPIES: {
    id: 'RIVAL_SPIES',
    type: 'RIVAL_SPIES',
    name: 'Rival Empire Agents',
    description: 'Skilled infiltrators from a competing empire, seeking to steal secrets and sabotage your progress.',
    icon: '🕵️',
    
    strength: 20,
    toughness: 30,
    speed: 95,
    cunning: 95,
    
    threatLevel: 4,
    minProvinceLevel: 2,
    
    victoryRewards: {
      influence: 100,
      gold: 200,
      iron: 50 // Confiscated equipment
    },
    defeatPenalties: {
      influence: -100,
      gold: -300,
      population: -15 // Information leaked
    },
    
    spawnWeight: 12,
    requirements: {
      minThreat: 15,
      nearResources: ['influence', 'gold']
    }
  },

  // === MYSTICAL THREATS ===
  CULTIST_INFILTRATORS: {
    id: 'CULTIST_INFILTRATORS',
    type: 'CULTIST_SECT',
    name: 'Cult of the Void',
    description: 'Fanatical cultists seeking to corrupt your population with dark promises of power.',
    icon: '🔮',
    
    strength: 30,
    toughness: 40,
    speed: 50,
    cunning: 90,
    
    threatLevel: 5,
    minProvinceLevel: 2,
    
    victoryRewards: {
      influence: 120,
      gold: 300,
      population: 20 // Rescued converts
    },
    defeatPenalties: {
      population: -80,
      influence: -75,
      food: -250 // Social disruption
    },
    
    spawnWeight: 10,
    requirements: {
      minThreat: 25,
      nearResources: ['influence', 'population']
    }
  },

  NECROMANCER_LEGION: {
    id: 'NECROMANCER_LEGION',
    type: 'CULTIST_SECT',
    name: 'Undead Legion',
    description: 'An army of the walking dead led by a powerful necromancer. They seek to add your population to their ranks.',
    icon: '💀',
    
    strength: 75,
    toughness: 90,
    speed: 30,
    cunning: 60,
    
    threatLevel: 9,
    minProvinceLevel: 3,
    
    victoryRewards: {
      influence: 250,
      gold: 600,
      iron: 200,
      stone: 400 // Ancient treasures
    },
    defeatPenalties: {
      population: -150,
      food: -800,
      influence: -100,
      gold: -400
    },
    
    spawnWeight: 3,
    requirements: {
      minThreat: 50,
      nearResources: ['population', 'influence']
    }
  }
};

// Helper functions for enemy selection
export function getEligibleEnemies(
  provinceLevel: number,
  threatLevel: number,
  availableResources: Record<string, number>
): EnemyForce[] {
  return Object.values(ENEMY_FORCES).filter(enemy => {
    // Check province level requirement
    if (provinceLevel < enemy.minProvinceLevel) {
      return false;
    }
    
    // Check threat level requirements
    if (enemy.requirements?.minThreat && threatLevel < enemy.requirements.minThreat) {
      return false;
    }
    
    if (enemy.requirements?.maxThreat && threatLevel > enemy.requirements.maxThreat) {
      return false;
    }
    
    // Check resource attractions
    if (enemy.requirements?.nearResources) {
      const hasAttractiveResources = enemy.requirements.nearResources.some(resource => 
        (availableResources[resource.toLowerCase()] || 0) > 500
      );
      if (!hasAttractiveResources) {
        return false;
      }
    }
    
    return true;
  });
}

export function selectRandomEnemy(eligibleEnemies: EnemyForce[]): EnemyForce | null {
  if (eligibleEnemies.length === 0) return null;
  
  const totalWeight = eligibleEnemies.reduce((sum, enemy) => sum + enemy.spawnWeight, 0);
  let random = Math.random() * totalWeight;
  
  for (const enemy of eligibleEnemies) {
    random -= enemy.spawnWeight;
    if (random <= 0) {
      return enemy;
    }
  }
  
  return eligibleEnemies[eligibleEnemies.length - 1];
}