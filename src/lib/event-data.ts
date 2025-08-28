// Game events database for idle-empire
import { GameEvent } from '@/types/events';

export const GAME_EVENTS: Record<string, GameEvent> = {
  // === DISCOVERY EVENTS ===
  ANCIENT_CACHE: {
    id: 'ANCIENT_CACHE',
    type: 'DISCOVERY',
    title: 'Ancient Cache Discovery',
    description: 'Your workers have uncovered an ancient storage chamber filled with preserved goods and gold coins from a forgotten civilization.',
    imageIcon: '💰',
    rarity: 'COMMON',
    impactType: 'IMMEDIATE',
    weight: 15,
    choices: [
      {
        id: 'take_all',
        text: 'Take Everything',
        description: 'Claim all the ancient treasures',
        outcome: {
          resources: { gold: 800, stone: 200, influence: 50 },
          message: 'Your province prospers from the ancient riches!'
        }
      },
      {
        id: 'preserve_site',
        text: 'Preserve for Study',
        description: 'Set up archaeological research',
        cost: { gold: 300 },
        outcome: {
          resources: { gold: 400, influence: 100 },
          governorXP: 150,
          message: 'Archaeological study brings knowledge and prestige to your empire.'
        }
      }
    ]
  },

  FERTILE_SOIL: {
    id: 'FERTILE_SOIL',
    type: 'DISCOVERY',
    title: 'Fertile Soil Discovery',
    description: 'A new patch of exceptionally fertile land has been discovered in your territory. Farmers are excited about the agricultural potential.',
    imageIcon: '🌱',
    rarity: 'COMMON',
    impactType: 'TEMPORARY',
    duration: 24, // 24 hours
    weight: 20,
    choices: [
      {
        id: 'plant_crops',
        text: 'Plant Immediate Crops',
        description: 'Rush farming for quick food production',
        cost: { gold: 200, population: 10 },
        outcome: {
          resources: { food: 1200 },
          message: 'Rapid farming yields abundant food supplies!'
        }
      },
      {
        id: 'develop_farmland',
        text: 'Develop Permanent Farmland',
        description: 'Invest in long-term agricultural infrastructure',
        cost: { gold: 500, stone: 300 },
        outcome: {
          resources: { food: 600 },
          message: 'New farmland will boost food production for the next 24 hours!',
          // This would trigger a temporary +25% food production bonus
        }
      }
    ]
  },

  // === DISASTER EVENTS ===
  WAREHOUSE_FIRE: {
    id: 'WAREHOUSE_FIRE',
    type: 'DISASTER',
    title: 'Warehouse Fire',
    description: 'A devastating fire has broken out in your main storage facility. Thick smoke billows across the province as precious resources are at risk.',
    imageIcon: '🔥',
    rarity: 'UNCOMMON',
    impactType: 'IMMEDIATE',
    weight: 8,
    choices: [
      {
        id: 'fight_fire',
        text: 'Organize Fire Brigade',
        description: 'Rally citizens to fight the blaze',
        cost: { population: 20, gold: 300 },
        outcome: {
          resources: { food: -500, stone: -200, iron: -100 },
          governorLoyalty: 5,
          message: 'Citizens rally together! Some resources lost but community bonds strengthen.'
        }
      },
      {
        id: 'let_burn',
        text: 'Let it Burn',
        description: 'Focus on protecting people, accept the loss',
        outcome: {
          resources: { food: -800, stone: -400, iron: -300, gold: -200 },
          governorLoyalty: -10,
          message: 'Heavy losses sustained. Your governor questions the lack of action.'
        }
      },
      {
        id: 'magical_intervention',
        text: 'Seek Magical Aid',
        description: 'Call upon ancient powers to control the flames',
        cost: { influence: 100 },
        requirements: { minBuildings: { ACADEMY: 1 } },
        outcome: {
          resources: { food: -100 },
          governorXP: 100,
          message: 'Ancient knowledge saves the day! Minimal losses through mystical intervention.'
        }
      }
    ]
  },

  PLAGUE_OUTBREAK: {
    id: 'PLAGUE_OUTBREAK',
    type: 'DISASTER', 
    title: 'Disease Outbreak',
    description: 'A mysterious illness spreads through your province. Healers work frantically as productivity grinds to a halt.',
    imageIcon: '🦠',
    rarity: 'RARE',
    impactType: 'TEMPORARY',
    duration: 12,
    weight: 4,
    choices: [
      {
        id: 'quarantine',
        text: 'Strict Quarantine',
        description: 'Isolate affected areas completely',
        outcome: {
          resources: { population: -100, food: -300 },
          message: 'Quarantine contains the outbreak but at great cost to productivity.'
        }
      },
      {
        id: 'herbal_remedies',
        text: 'Traditional Medicine',
        description: 'Use local knowledge and herbs',
        cost: { gold: 400 },
        outcome: {
          resources: { population: -50 },
          governorLoyalty: 10,
          message: 'Traditional remedies prove effective. Governor gains respect for wisdom.'
        }
      }
    ]
  },

  // === TRADE EVENTS ===
  MERCHANT_CARAVAN: {
    id: 'MERCHANT_CARAVAN',
    type: 'TRADE',
    title: 'Merchant Caravan Arrival',
    description: 'A wealthy merchant caravan has stopped in your province, offering exotic goods and seeking to establish trade relations.',
    imageIcon: '🐪',
    rarity: 'COMMON',
    impactType: 'IMMEDIATE',
    weight: 12,
    requirements: { minBuildings: { MARKETPLACE: 1 } },
    choices: [
      {
        id: 'luxury_trade',
        text: 'Trade for Luxury Goods',
        description: 'Exchange resources for influence and rare items',
        cost: { gold: 600, food: 300 },
        outcome: {
          resources: { influence: 150, iron: 200 },
          message: 'Exotic trade goods boost your prestige across the empire!'
        }
      },
      {
        id: 'bulk_trade',
        text: 'Bulk Resource Exchange',
        description: 'Focus on practical resource trading',
        cost: { stone: 500 },
        outcome: {
          resources: { gold: 1000, food: 400 },
          message: 'Profitable trade strengthens your treasury!'
        }
      },
      {
        id: 'establish_route',
        text: 'Establish Trade Route',
        description: 'Invest in permanent trading relationship',
        cost: { gold: 800, influence: 50 },
        outcome: {
          resources: { gold: 300 },
          message: 'New trade route established! Merchants will return regularly.',
          followupEventChance: 0.3 // 30% chance to trigger another trade event
        }
      }
    ]
  },

  // === BARBARIAN EVENTS ===
  BARBARIAN_SCOUTS: {
    id: 'BARBARIAN_SCOUTS',
    type: 'BARBARIAN',
    title: 'Barbarian Scouts Spotted',
    description: 'Your border guards report strange figures watching your province from the hills. Barbarian scouts are assessing your defenses.',
    imageIcon: '⚔️',
    rarity: 'UNCOMMON',
    impactType: 'IMMEDIATE',
    weight: 10,
    choices: [
      {
        id: 'military_response',
        text: 'Show of Force',
        description: 'Deploy troops to intimidate the scouts',
        requirements: { minBuildings: { BARRACKS: 1 } },
        cost: { gold: 200 },
        outcome: {
          resources: { influence: 75 },
          governorXP: 50,
          message: 'Your military display discourages barbarian interest. Word spreads of your strength.'
        }
      },
      {
        id: 'diplomatic_approach',
        text: 'Peaceful Contact',
        description: 'Attempt communication and negotiation',
        cost: { food: 300, gold: 150 },
        outcome: {
          resources: { influence: 25 },
          message: 'Diplomatic gifts establish uneasy peace. The barbarians withdraw... for now.'
        }
      },
      {
        id: 'ignore_scouts',
        text: 'Ignore Them',
        description: 'Continue normal operations',
        outcome: {
          message: 'The scouts observe your province and disappear. Their intentions remain unknown...',
          followupEventChance: 0.6 // High chance of barbarian raid later
        }
      }
    ]
  },

  // === ARTIFACT EVENTS ===
  CRYSTAL_DISCOVERY: {
    id: 'CRYSTAL_DISCOVERY',
    type: 'ARTIFACT',
    title: 'Mysterious Crystal',
    description: 'Miners have discovered a glowing crystal deep underground. It pulses with an otherworldly energy that seems to enhance nearby workers.',
    imageIcon: '💎',
    rarity: 'LEGENDARY',
    impactType: 'PERMANENT',
    weight: 2,
    requirements: { minBuildings: { MINE: 2 } },
    choices: [
      {
        id: 'study_crystal',
        text: 'Scientific Study',
        description: 'Research the crystal\'s properties',
        requirements: { minBuildings: { ACADEMY: 1 } },
        cost: { gold: 1000, influence: 100 },
        outcome: {
          resources: { influence: 200 },
          governorXP: 300,
          message: 'Crystal study reveals ancient mining techniques! All mines gain permanent efficiency.'
        }
      },
      {
        id: 'display_crystal',
        text: 'Create Monument',
        description: 'Display the crystal as a symbol of power',
        cost: { stone: 800, gold: 500 },
        outcome: {
          resources: { influence: 300 },
          governorLoyalty: 15,
          message: 'The crystal monument inspires your people and attracts visitors from across the empire!'
        }
      }
    ]
  }
};

// Event spawning weights by rarity
export const RARITY_WEIGHTS = {
  COMMON: 1.0,
  UNCOMMON: 0.6,
  RARE: 0.3,
  LEGENDARY: 0.1
} as const;