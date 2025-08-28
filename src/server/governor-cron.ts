// Governor AI automation service - runs periodically to execute governor decisions
import { PrismaClient } from "@prisma/client";
import { 
  makeGovernorDecision,
  updateGovernorExperience,
  type ProvinceState,
  type EmpireState 
} from "../lib/governor-ai";
import { getBuildingUpgradeCost, TECHNOLOGY_DATA } from "../lib/timer-service";

const prisma = new PrismaClient();

export async function runGovernorAI() {
  console.log("🤖 Running Governor AI decisions...");
  
  try {
    // Get all cities with governors
    const cities = await prisma.city.findMany({
      include: {
        provinces: {
          include: {
            governor: true,
            buildings: true,
            stocks: true,
            constructions: {
              where: { status: "PENDING" },
            },
          },
        },
        researches: {
          where: { status: "PENDING" },
        },
      },
    });

    let totalDecisions = 0;
    let totalErrors = 0;

    for (const city of cities) {
      // Skip cities without governors
      if (!city.provinces.some(p => p.governor)) continue;

      // Prepare empire state
      const totalResources: Record<string, number> = {};
      city.provinces.forEach((province) => {
        province.stocks.forEach((stock) => {
          const resource = stock.type.toLowerCase();
          totalResources[resource] = (totalResources[resource] || 0) + stock.amount;
        });
      });

      const empireState: EmpireState = {
        provinces: city.provinces.map((province) => ({
          id: province.id,
          name: province.name,
          resources: province.stocks.reduce((acc, stock) => {
            acc[stock.type.toLowerCase()] = stock.amount;
            return acc;
          }, {} as Record<string, number>),
          buildings: province.buildings,
          activeConstructions: province.constructions,
          governor: province.governor ? {
            name: province.governor.name,
            personality: province.governor.personality,
            loyalty: province.governor.loyalty,
            xp: province.governor.xp,
          } : {
            name: "No Governor",
            personality: "CONSERVATIVE" as any,
            loyalty: 0,
            xp: 0,
          },
        })),
        activeResearches: city.researches,
        totalResources,
      };

      // Process each province with a governor
      for (const province of city.provinces) {
        if (!province.governor) continue;

        try {
          const provinceState: ProvinceState = {
            id: province.id,
            name: province.name,
            resources: province.stocks.reduce((acc, stock) => {
              acc[stock.type.toLowerCase()] = stock.amount;
              return acc;
            }, {} as Record<string, number>),
            buildings: province.buildings,
            activeConstructions: province.constructions,
            governor: {
              name: province.governor.name,
              personality: province.governor.personality,
              loyalty: province.governor.loyalty,
              xp: province.governor.xp,
            },
          };

          // Make AI decision (less frequent than manual triggers)
          // Only act every few cycles to avoid overwhelming the player
          const shouldAct = Math.random() < 0.3; // 30% chance to act per cycle
          
          if (!shouldAct) continue;

          const decision = makeGovernorDecision(provinceState, empireState);
          
          if (decision.type !== 'WAIT' && decision.action) {
            if (decision.type === 'BUILD' && decision.action.buildingType) {
              // Execute building construction
              const currentLevel = province.buildings.find(b => b.type === decision.action!.buildingType)?.level || 0;
              const { cost, time } = getBuildingUpgradeCost(decision.action.buildingType, currentLevel);
              
              // Check if can afford
              const canAfford = Object.entries(cost).every(([resource, amount]) => {
                const available = provinceState.resources[resource] || 0;
                return available >= amount;
              });

              if (canAfford) {
                // Deduct resources
                for (const [resource, amount] of Object.entries(cost)) {
                  const resourceType = resource.toUpperCase() as any;
                  await prisma.resourceStock.updateMany({
                    where: {
                      provinceId: province.id,
                      type: resourceType,
                    },
                    data: {
                      amount: { decrement: amount },
                    },
                  });
                }

                // Create construction task
                const finishTime = new Date(Date.now() + time * 60 * 60 * 1000);
                await prisma.constructionTask.create({
                  data: {
                    provinceId: province.id,
                    buildingType: decision.action.buildingType,
                    targetLevel: currentLevel + 1,
                    finishesAt: finishTime,
                    status: "PENDING",
                  },
                });

                // Update governor XP and loyalty
                const newXP = updateGovernorExperience(province.governor, decision);
                const loyaltyIncrease = Math.floor(Math.random() * 5) + 1; // 1-5 loyalty increase
                await prisma.governor.update({
                  where: { id: province.governor.id },
                  data: { 
                    xp: newXP,
                    loyalty: Math.min(100, province.governor.loyalty + loyaltyIncrease)
                  },
                });

                console.log(`🏗️ ${province.governor.name} (${province.name}): Started building ${decision.action.buildingType.toLowerCase()} level ${currentLevel + 1}`);
                totalDecisions++;
              }
            } else if (decision.type === 'RESEARCH' && decision.action.techKey) {
              // Execute research (empire-wide resource check)
              const tech = TECHNOLOGY_DATA[decision.action.techKey];
              if (tech && !city.researches.some(r => r.techKey === decision.action!.techKey)) {
                // Check if can afford (using total empire resources)
                const canAfford = Object.entries(tech.cost).every(([resource, amount]) => {
                  const available = totalResources[resource] || 0;
                  return available >= amount;
                });

                if (canAfford) {
                  // Deduct resources from provinces
                  for (const [resource, amount] of Object.entries(tech.cost)) {
                    let remaining = amount;
                    const resourceType = resource.toUpperCase() as any;
                    
                    for (const prov of city.provinces) {
                      if (remaining <= 0) break;
                      
                      const stock = prov.stocks.find((s) => s.type === resourceType);
                      if (stock && stock.amount > 0) {
                        const deduction = Math.min(remaining, stock.amount);
                        await prisma.resourceStock.update({
                          where: { id: stock.id },
                          data: { amount: stock.amount - deduction },
                        });
                        remaining -= deduction;
                      }
                    }
                  }

                  // Create research task
                  const finishTime = new Date(Date.now() + tech.researchTime * 60 * 60 * 1000);
                  await prisma.researchTask.create({
                    data: {
                      cityId: city.id,
                      techKey: decision.action.techKey,
                      finishesAt: finishTime,
                      status: "PENDING",
                    },
                  });

                  // Update governor XP and loyalty
                  const newXP = updateGovernorExperience(province.governor, decision);
                  const loyaltyIncrease = Math.floor(Math.random() * 3) + 2; // 2-4 loyalty increase (research is prestigious)
                  await prisma.governor.update({
                    where: { id: province.governor.id },
                    data: { 
                      xp: newXP,
                      loyalty: Math.min(100, province.governor.loyalty + loyaltyIncrease)
                    },
                  });

                  console.log(`🔬 ${province.governor.name} (${province.name}): Started research ${tech.name}`);
                  totalDecisions++;
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ Governor AI error for ${province.governor.name}:`, error);
          totalErrors++;
        }
      }
    }

    console.log(`✅ Governor AI completed: ${totalDecisions} decisions made, ${totalErrors} errors`);
    return { decisions: totalDecisions, errors: totalErrors };
    
  } catch (error) {
    console.error("❌ Governor AI system error:", error);
    throw error;
  }
}

// Auto-run governor AI every 15 minutes
let governorInterval: NodeJS.Timeout | null = null;

export function startGovernorCron() {
  if (governorInterval) return; // Already running
  
  console.log("🕐 Starting Governor AI automation (15 minute intervals)");
  
  // Run immediately on startup
  runGovernorAI().catch(console.error);
  
  // Then run every 15 minutes
  governorInterval = setInterval(() => {
    runGovernorAI().catch(console.error);
  }, 15 * 60 * 1000); // 15 minutes
}

export function stopGovernorCron() {
  if (governorInterval) {
    clearInterval(governorInterval);
    governorInterval = null;
    console.log("⏹️ Governor AI automation stopped");
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  stopGovernorCron();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopGovernorCron();
  process.exit(0);
});