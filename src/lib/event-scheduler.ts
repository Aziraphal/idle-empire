// Automatic event scheduling system
import { PrismaClient } from "@prisma/client";

export interface EventSchedulerConfig {
  baseCheckInterval: number; // Minutes between event generation checks
  eventCooldown: number; // Hours between events per province
  maxConcurrentEvents: number; // Max unresolved events per province
  raidChance: number; // Chance of generating raid vs regular event (0-1)
  raidCooldown: number; // Hours between raids per province
}

export const DEFAULT_EVENT_CONFIG: EventSchedulerConfig = {
  baseCheckInterval: 30, // Check every 30 minutes
  eventCooldown: 4, // 4 hours minimum between events
  maxConcurrentEvents: 1, // Only 1 active event per province
  raidChance: 0.3, // 30% chance of raid vs regular event
  raidCooldown: 6, // 6 hours between raids
};

// Check if a province is eligible for a new event
export async function isProvinceEligibleForEvent(
  prisma: PrismaClient,
  provinceId: string,
  config: EventSchedulerConfig = DEFAULT_EVENT_CONFIG
): Promise<boolean> {
  // Check for existing unresolved events
  const unresolvedEvents = await prisma.gameEventInstance.count({
    where: {
      provinceId,
      resolved: false
    }
  });

  if (unresolvedEvents >= config.maxConcurrentEvents) {
    return false;
  }

  // Check cooldown period
  const cutoffTime = new Date(Date.now() - config.eventCooldown * 60 * 60 * 1000);
  const recentEvents = await prisma.gameEventInstance.count({
    where: {
      provinceId,
      triggeredAt: {
        gte: cutoffTime
      }
    }
  });

  return recentEvents === 0;
}

// Check if a province is eligible for a raid
export async function isProvinceEligibleForRaid(
  prisma: PrismaClient,
  provinceId: string,
  config: EventSchedulerConfig = DEFAULT_EVENT_CONFIG
): Promise<boolean> {
  // Check for existing unresolved raids
  const activeRaids = await prisma.raidEvent.count({
    where: {
      provinceId,
      resolved: false
    }
  });

  if (activeRaids > 0) {
    return false;
  }

  // Check raid-specific cooldown
  const cutoffTime = new Date(Date.now() - config.raidCooldown * 60 * 60 * 1000);
  const recentRaids = await prisma.raidEvent.count({
    where: {
      provinceId,
      detectedAt: {
        gte: cutoffTime
      }
    }
  });

  return recentRaids === 0;
}

// Get all provinces eligible for event generation
export async function getEligibleProvinces(
  prisma: PrismaClient,
  userId?: string,
  config: EventSchedulerConfig = DEFAULT_EVENT_CONFIG
): Promise<string[]> {
  // Get all provinces (optionally filtered by user)
  const whereClause: any = {};
  if (userId) {
    whereClause.city = { userId };
  }

  const provinces = await prisma.province.findMany({
    where: whereClause,
    select: { id: true }
  });

  // Filter eligible provinces
  const eligibleProvinces: string[] = [];
  
  for (const province of provinces) {
    const isEligible = await isProvinceEligibleForEvent(prisma, province.id, config);
    if (isEligible) {
      eligibleProvinces.push(province.id);
    }
  }

  return eligibleProvinces;
}

// Clean up expired events that weren't resolved
export async function cleanupExpiredEvents(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  
  const expiredEvents = await prisma.gameEventInstance.updateMany({
    where: {
      resolved: false,
      expiresAt: {
        lte: now
      }
    },
    data: {
      resolved: true,
      resolvedAt: now,
      choiceId: 'AUTO_EXPIRED'
    }
  });

  return expiredEvents.count;
}

// Clean up old resolved events (older than 7 days)
export async function cleanupOldEvents(prisma: PrismaClient): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  
  const deletedEvents = await prisma.gameEventInstance.deleteMany({
    where: {
      resolved: true,
      resolvedAt: {
        lte: cutoff
      }
    }
  });

  return deletedEvents.count;
}

// Clean up expired temporary effects
export async function cleanupExpiredEffects(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  
  const deletedEffects = await prisma.temporaryEffect.deleteMany({
    where: {
      expiresAt: {
        lte: now
      }
    }
  });

  return deletedEffects.count;
}

// Main scheduler function - runs periodically
export async function runEventScheduler(
  prisma: PrismaClient,
  config: EventSchedulerConfig = DEFAULT_EVENT_CONFIG
): Promise<{
  eventsGenerated: number;
  raidsGenerated: number;
  expiredEvents: number;
  cleanedOldEvents: number;
  cleanedEffects: number;
  eligibleProvinces: number;
}> {
  console.log('🎲 Running event scheduler...');

  // Cleanup expired/old data first
  const expiredEvents = await cleanupExpiredEvents(prisma);
  const cleanedOldEvents = await cleanupOldEvents(prisma);
  const cleanedEffects = await cleanupExpiredEffects(prisma);

  if (expiredEvents > 0) console.log(`⏰ Expired ${expiredEvents} unresolved events`);
  if (cleanedOldEvents > 0) console.log(`🗑️ Cleaned ${cleanedOldEvents} old events`);
  if (cleanedEffects > 0) console.log(`✨ Cleaned ${cleanedEffects} expired effects`);

  // Get eligible provinces
  const eligibleProvinces = await getEligibleProvinces(prisma, undefined, config);
  console.log(`🏛️ Found ${eligibleProvinces.length} provinces eligible for events`);

  if (eligibleProvinces.length === 0) {
    return {
      eventsGenerated: 0,
      raidsGenerated: 0,
      expiredEvents,
      cleanedOldEvents,
      cleanedEffects,
      eligibleProvinces: 0
    };
  }

  // Generate events and raids for eligible provinces
  let eventsGenerated = 0;
  let raidsGenerated = 0;

  // Import event generation functions
  const { calculateEventChance, getEligibleEvents, selectRandomEvent, createEventInstance } = await import('./event-engine');
  const { GAME_EVENTS } = await import('./event-data');

  for (const provinceId of eligibleProvinces) {
    try {
      // Get full province context
      const province = await prisma.province.findUnique({
        where: { id: provinceId },
        include: {
          city: true,
          stocks: true,
          buildings: true,
          governor: true
        }
      });

      if (!province) continue;

      // Get empire context
      const allProvinces = await prisma.province.count({
        where: { city: { userId: province.city.userId } }
      });

      const allResources = await prisma.resourceStock.findMany({
        where: { province: { city: { userId: province.city.userId } } }
      });

      // Build contexts
      const provinceContext = {
        id: province.id,
        name: province.name,
        level: province.level,
        threat: province.threat,
        buildings: province.buildings,
        resources: province.stocks.reduce((acc, stock) => {
          acc[stock.type.toLowerCase()] = stock.amount;
          return acc;
        }, {} as Record<string, number>),
        governor: province.governor
      };

      const empireContext = {
        totalProvinces: allProvinces,
        totalResources: allResources.reduce((acc, stock) => {
          acc[stock.type.toLowerCase()] = (acc[stock.type.toLowerCase()] || 0) + stock.amount;
          return acc;
        }, {} as Record<string, number>)
      };

      // Check if event should spawn
      const spawnChance = calculateEventChance(provinceContext, empireContext);
      
      // Reduce spawn chance slightly for automatic generation
      const adjustedSpawnChance = spawnChance * 0.7; // 30% reduction
      
      if (Math.random() > adjustedSpawnChance) {
        continue; // Skip this province
      }

      // Decide whether to generate a raid or regular event
      const shouldGenerateRaid = Math.random() < config.raidChance;
      
      if (shouldGenerateRaid) {
        // Check if province is eligible for raids
        const isEligibleForRaid = await isProvinceEligibleForRaid(prisma, provinceId, config);
        
        if (isEligibleForRaid) {
          // Import raid generation functions
          const { getEligibleEnemies, selectRandomEnemy } = await import('./enemy-data');
          
          // Get eligible enemies
          const eligibleEnemies = getEligibleEnemies(
            province.level,
            province.threat,
            provinceContext.resources
          );
          
          const selectedEnemy = selectRandomEnemy(eligibleEnemies);
          
          if (selectedEnemy) {
            // Calculate raid timing (10-30 minutes to prepare)
            const preparationMinutes = Math.floor(Math.random() * 20) + 10;
            const arrivalTime = new Date(Date.now() + preparationMinutes * 60 * 1000);

            // Create raid event
            await prisma.raidEvent.create({
              data: {
                provinceId: province.id,
                enemyType: selectedEnemy.type as any,
                enemyName: selectedEnemy.name,
                enemyStrength: selectedEnemy.strength,
                enemyThreatLevel: selectedEnemy.threatLevel,
                arrivalTime,
                preparationTime: preparationMinutes
              }
            });

            raidsGenerated++;
            console.log(`⚔️ Generated raid "${selectedEnemy.name}" against province ${province.name}`);
            continue; // Skip regular event generation for this province
          }
        }
      }

      // Generate regular event if raid wasn't generated
      const eligibleEvents = getEligibleEvents(provinceContext, empireContext);
      const selectedEvent = selectRandomEvent(eligibleEvents);

      if (selectedEvent) {
        // Create event instance
        const eventInstanceData = createEventInstance(selectedEvent, province.id);
        await prisma.gameEventInstance.create({
          data: eventInstanceData
        });

        eventsGenerated++;
        console.log(`🎭 Generated event "${selectedEvent.title}" for province ${province.name}`);
      }

    } catch (error) {
      console.error(`❌ Error generating event for province ${provinceId}:`, error);
    }
  }

  console.log(`🎲 Event scheduler complete: ${eventsGenerated} events and ${raidsGenerated} raids generated`);

  return {
    eventsGenerated,
    raidsGenerated,
    expiredEvents,
    cleanedOldEvents,
    cleanedEffects,
    eligibleProvinces: eligibleProvinces.length
  };
}