// Combat resolution engine for idle-empire
import { EnemyForce, DefenseForce, CombatResult, CombatFactors, CombatOutcome } from '@/types/combat';
import { GovernorPersonality } from '@prisma/client';

// Calculate defense strength based on province state
export function calculateDefenseForce(province: {
  level: number;
  buildings: Array<{ type: string; level: number }>;
  stocks: Array<{ type: string; amount: number }>;
  governor: {
    personality: GovernorPersonality;
    loyalty: number;
    xp: number;
  } | null;
}): DefenseForce {
  // Base defenses from buildings
  const barracks = province.buildings.find(b => b.type === 'BARRACKS');
  const smithy = province.buildings.find(b => b.type === 'SMITHY');
  const walls = province.buildings.find(b => b.type === 'WALLS');
  const watchtower = province.buildings.find(b => b.type === 'WATCHTOWER');
  
  const resources = province.stocks.reduce((acc, stock) => {
    acc[stock.type.toLowerCase()] = stock.amount;
    return acc;
  }, {} as Record<string, number>);
  
  // Population and infrastructure
  const population = resources.pop || 0;
  const militiaSize = Math.floor(population * 0.1); // 10% of population can fight
  const populationMorale = Math.min(100, 50 + (population / 20)); // Higher pop = higher morale
  
  // Governor leadership bonus
  let governorBonus = 0;
  let governorPersonalityType = '';
  
  if (province.governor) {
    const { personality, loyalty, xp } = province.governor;
    governorPersonalityType = personality;
    
    // Base governor effectiveness
    const loyaltyBonus = loyalty / 100; // 0-1 multiplier
    const experienceBonus = Math.min(1.5, 1 + (xp / 2000)); // Up to 50% bonus
    
    // Personality-specific combat bonuses
    switch (personality) {
      case 'AGGRESSIVE':
        governorBonus = 40 * loyaltyBonus * experienceBonus; // Best at combat
        break;
      case 'CONSERVATIVE':
        governorBonus = 25 * loyaltyBonus * experienceBonus; // Good at defense
        break;
      case 'MERCHANT':
        governorBonus = 15 * loyaltyBonus * experienceBonus; // Can buy mercenaries
        break;
      case 'EXPLORER':
        governorBonus = 20 * loyaltyBonus * experienceBonus; // Tactical knowledge
        break;
      default:
        governorBonus = 20 * loyaltyBonus * experienceBonus;
    }
  }
  
  return {
    wallLevel: walls?.level || 0,
    garrisonSize: (barracks?.level || 0) * 25,
    watchtowers: watchtower?.level || 0,
    
    barracksBonus: (barracks?.level || 0) * 15,
    smithyBonus: (smithy?.level || 0) * 10,
    stableBonus: 0, // TODO: Add stables building
    
    governorBonus,
    governorPersonality: governorPersonalityType,
    governorLoyalty: province.governor?.loyalty || 0,
    
    militiaSize,
    populationMorale,
    
    recentVictories: 0, // TODO: Track recent combat history
    strategicReserves: Math.floor((resources.gold || 0) / 100) // Can spend gold for defense
  };
}

// Calculate all combat factors
export function calculateCombatFactors(
  enemy: EnemyForce,
  defense: DefenseForce
): CombatFactors {
  // Base strength comparison
  const attackerStrength = enemy.strength + enemy.cunning * 0.5;
  const defenderStrength = 
    defense.garrisonSize * 0.8 +
    defense.militiaSize * 0.4 +
    defense.barracksBonus +
    defense.smithyBonus +
    defense.governorBonus;
  
  const strengthRatio = defenderStrength / Math.max(1, attackerStrength);
  
  // Terrain and fortification bonuses
  const terrainBonus = 
    defense.wallLevel * 0.15 +           // Walls provide cover
    defense.watchtowers * 0.1 +          // Early warning
    0.2;                                 // Base defensive terrain bonus
  
  // Preparation time (governors get different prep bonuses)
  let preparationBonus = 0.1; // Base preparation
  switch (defense.governorPersonality) {
    case 'AGGRESSIVE':
      preparationBonus = 0.15; // Quick to mobilize
      break;
    case 'CONSERVATIVE':
      preparationBonus = 0.25; // Always prepared
      break;
    case 'EXPLORER':
      preparationBonus = 0.20; // Good intelligence
      break;
    case 'MERCHANT':
      preparationBonus = 0.12; // Can hire quickly
      break;
  }
  
  // Leadership effectiveness
  const leadershipBonus = defense.governorBonus / 100;
  
  // Morale effects
  const moraleBonus = (defense.populationMorale - 50) / 200; // -0.25 to +0.25
  
  // Equipment quality
  const equipmentBonus = 
    defense.smithyBonus / 100 +
    defense.strategicReserves / 1000; // Can buy better equipment
  
  // Tactical bonuses based on governor personality
  let tacticalBonus = 0;
  switch (defense.governorPersonality) {
    case 'AGGRESSIVE':
      tacticalBonus = 0.1; // Aggressive tactics
      break;
    case 'CONSERVATIVE':
      tacticalBonus = 0.15; // Defensive strategies
      break;
    case 'EXPLORER':
      tacticalBonus = 0.2; // Best tactical knowledge
      break;
    case 'MERCHANT':
      tacticalBonus = 0.05; // Limited military knowledge
      break;
  }
  
  // Random factors
  const weatherEffect = (Math.random() - 0.5) * 0.1; // ±5%
  const luckFactor = (Math.random() - 0.5) * 0.15; // ±7.5%
  const surpriseFactor = Math.random() * 0.1; // 0-10% defender advantage
  
  return {
    strengthRatio,
    terrainBonus,
    preparationBonus,
    leadershipBonus,
    moraleBonus,
    equipmentBonus,
    tacticalBonus,
    weatherEffect,
    luckFactor,
    surpriseFactor
  };
}

// Resolve combat and return detailed results
export function resolveCombat(
  enemy: EnemyForce,
  defense: DefenseForce
): CombatResult {
  const factors = calculateCombatFactors(enemy, defense);
  
  // Calculate overall combat effectiveness
  const defenseScore = 
    factors.strengthRatio +
    factors.terrainBonus +
    factors.preparationBonus +
    factors.leadershipBonus +
    factors.moraleBonus +
    factors.equipmentBonus +
    factors.tacticalBonus +
    factors.weatherEffect +
    factors.luckFactor +
    factors.surpriseFactor;
  
  // Determine outcome based on defense effectiveness
  let outcome: CombatOutcome;
  let victoryCertainty: number;
  
  if (defenseScore >= 1.3) {
    outcome = 'VICTORY';
    victoryCertainty = Math.min(0.95, (defenseScore - 1.3) / 0.7 + 0.7);
  } else if (defenseScore >= 0.8) {
    outcome = 'DRAW';
    victoryCertainty = 0.5;
  } else {
    outcome = 'DEFEAT';
    victoryCertainty = Math.min(0.95, (0.8 - defenseScore) / 0.8 + 0.5);
  }
  
  // Calculate casualties and damage
  const baseCasualties = enemy.strength / 4;
  const defenderCasualties = Math.floor(
    baseCasualties * (outcome === 'VICTORY' ? 0.3 : outcome === 'DRAW' ? 0.6 : 1.2) * (1 - victoryCertainty * 0.3)
  );
  
  const enemyCasualties = Math.floor(
    enemy.strength * (outcome === 'VICTORY' ? 0.8 : outcome === 'DRAW' ? 0.5 : 0.3) * victoryCertainty
  );
  
  const infrastructureDamage = Math.floor(
    enemy.strength * 0.1 * (outcome === 'VICTORY' ? 0.1 : outcome === 'DRAW' ? 0.3 : 0.6)
  );
  
  // Resource changes based on outcome
  let resourcesGained: Record<string, number> = {};
  let resourcesLost: Record<string, number> = {};
  
  if (outcome === 'VICTORY') {
    resourcesGained = { ...enemy.victoryRewards };
    // Reduce losses by victory margin
    const lossReduction = victoryCertainty * 0.7;
    Object.entries(enemy.defeatPenalties).forEach(([resource, loss]) => {
      if (loss < 0) {
        resourcesLost[resource] = Math.floor(loss * (1 - lossReduction));
      }
    });
  } else if (outcome === 'DRAW') {
    // Partial rewards and losses
    Object.entries(enemy.victoryRewards).forEach(([resource, reward]) => {
      resourcesGained[resource] = Math.floor(reward * 0.3);
    });
    Object.entries(enemy.defeatPenalties).forEach(([resource, loss]) => {
      if (loss < 0) {
        resourcesLost[resource] = Math.floor(loss * 0.6);
      }
    });
  } else {
    resourcesLost = { ...enemy.defeatPenalties };
    // Additional infrastructure damage
    resourcesLost.stone = (resourcesLost.stone || 0) - infrastructureDamage;
  }
  
  // Governor experience and loyalty changes
  let governorXpGain = 0;
  let governorLoyaltyChange = 0;
  
  if (defense.governorBonus > 0) {
    switch (outcome) {
      case 'VICTORY':
        governorXpGain = Math.floor(enemy.threatLevel * 25 + victoryCertainty * 50);
        governorLoyaltyChange = Math.floor(2 + victoryCertainty * 3);
        break;
      case 'DRAW':
        governorXpGain = Math.floor(enemy.threatLevel * 15);
        governorLoyaltyChange = 1;
        break;
      case 'DEFEAT':
        governorXpGain = Math.floor(enemy.threatLevel * 10);
        governorLoyaltyChange = Math.floor(-2 - victoryCertainty * 2);
        break;
    }
  }
  
  // Population morale changes
  let populationMoraleChange = 0;
  switch (outcome) {
    case 'VICTORY':
      populationMoraleChange = Math.floor(5 + victoryCertainty * 10);
      break;
    case 'DRAW':
      populationMoraleChange = -1;
      break;
    case 'DEFEAT':
      populationMoraleChange = Math.floor(-5 - victoryCertainty * 8);
      break;
  }
  
  // Generate battle report
  const battleReport = generateBattleReport(enemy, defense, outcome, factors, victoryCertainty);
  
  return {
    outcome,
    victoryCertainty,
    defenderCasualties,
    enemyCasualties,
    infrastructureDamage,
    resourcesGained,
    resourcesLost,
    governorXpGain,
    governorLoyaltyChange,
    populationMoraleChange,
    battleReport
  };
}

// Generate narrative battle report
function generateBattleReport(
  enemy: EnemyForce,
  defense: DefenseForce,
  outcome: CombatOutcome,
  factors: CombatFactors,
  certainty: number
): string {
  const governorName = "your governor"; // TODO: Get actual governor name
  const decisive = certainty > 0.7;
  const close = certainty < 0.3;
  
  let report = `${enemy.name} approached your province with ${enemy.strength} strength. `;
  
  // Opening engagement
  if (factors.preparationBonus > 0.2) {
    report += `Thanks to excellent preparation by ${governorName}, your defenses were ready. `;
  } else if (factors.surpriseFactor > 0.05) {
    report += `The attack caught some defenders off-guard, but your forces quickly rallied. `;
  }
  
  // Combat description based on governor personality
  switch (defense.governorPersonality) {
    case 'AGGRESSIVE':
      report += `${governorName} led a bold counter-attack, meeting the enemy head-on. `;
      break;
    case 'CONSERVATIVE':
      report += `${governorName} employed proven defensive tactics, holding strong positions. `;
      break;
    case 'EXPLORER':
      report += `${governorName} used clever tactical maneuvers to outflank the attackers. `;
      break;
    case 'MERCHANT':
      report += `${governorName} coordinated hired mercenaries alongside the local militia. `;
      break;
    default:
      report += `Your forces engaged the enemy with determination. `;
  }
  
  // Outcome description
  switch (outcome) {
    case 'VICTORY':
      if (decisive) {
        report += `The battle was a decisive victory! Your superior strategy and preparation overwhelmed the attackers.`;
      } else if (close) {
        report += `After fierce fighting, your defenders emerged victorious, though the battle was hard-fought.`;
      } else {
        report += `Your forces achieved victory through solid combat effectiveness.`;
      }
      break;
      
    case 'DRAW':
      report += `The battle ended in a costly stalemate. Both sides withdrew after heavy fighting, with neither achieving their objectives.`;
      break;
      
    case 'DEFEAT':
      if (decisive) {
        report += `Despite brave resistance, your forces were overwhelmed by superior enemy numbers and tactics.`;
      } else if (close) {
        report += `The defenders fought valiantly but were ultimately forced to retreat. The defeat was narrow but costly.`;
      } else {
        report += `Your defenses proved insufficient against the enemy assault.`;
      }
      break;
  }
  
  // Weather or special conditions
  if (Math.abs(factors.weatherEffect) > 0.05) {
    if (factors.weatherEffect > 0) {
      report += ` Favorable weather conditions aided the defense.`;
    } else {
      report += ` Poor weather hindered defensive operations.`;
    }
  }
  
  return report;
}