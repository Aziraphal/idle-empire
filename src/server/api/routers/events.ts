import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { 
  calculateEventChance, 
  getEligibleEvents, 
  selectRandomEvent,
  canAffordChoice,
  processEventChoice,
  createEventInstance
} from "@/lib/event-engine";
import { GAME_EVENTS } from "@/lib/event-data";

export const eventsRouter = createTRPCRouter({
  // Get all active events for user's provinces
  getActiveEvents: protectedProcedure.query(async ({ ctx }) => {
    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        provinces: {
          include: {
            events: {
              where: { resolved: false },
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!city) {
      throw new TRPCError({ code: "NOT_FOUND", message: "City not found" });
    }

    // Flatten events from all provinces
    const activeEvents = city.provinces.flatMap(province => 
      province.events.map(event => ({
        ...event,
        provinceName: province.name,
        eventData: GAME_EVENTS[event.eventKey]
      }))
    );

    return activeEvents;
  }),

  // Trigger event generation for a province (called periodically)
  triggerEventGeneration: protectedProcedure
    .input(z.object({ provinceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get province with full context
      const province = await ctx.prisma.province.findUnique({
        where: { id: input.provinceId },
        include: {
          city: true,
          stocks: true,
          buildings: true,
          governor: true,
          events: {
            where: { resolved: false }
          }
        }
      });

      if (!province || province.city.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Province not found" });
      }

      // Don't generate new events if there's already an unresolved one
      if (province.events.length > 0) {
        return { eventGenerated: false, reason: "Unresolved event exists" };
      }

      // Get empire context
      const allProvinces = await ctx.prisma.province.count({
        where: { city: { userId: ctx.userId } }
      });

      const allResources = await ctx.prisma.resourceStock.findMany({
        where: { province: { city: { userId: ctx.userId } } }
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
      if (Math.random() > spawnChance) {
        return { eventGenerated: false, reason: "Random chance failed", spawnChance };
      }

      // Get eligible events and select one
      const eligibleEvents = getEligibleEvents(provinceContext, empireContext);
      const selectedEvent = selectRandomEvent(eligibleEvents);

      if (!selectedEvent) {
        return { eventGenerated: false, reason: "No eligible events", eligibleCount: eligibleEvents.length };
      }

      // Create event instance
      const eventInstanceData = createEventInstance(selectedEvent, province.id);
      const eventInstance = await ctx.prisma.gameEventInstance.create({
        data: eventInstanceData
      });

      return {
        eventGenerated: true,
        event: {
          ...eventInstance,
          eventData: selectedEvent
        }
      };
    }),

  // Resolve an event with player choice
  resolveEvent: protectedProcedure
    .input(z.object({
      eventId: z.string(),
      choiceId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Get event instance
      const eventInstance = await ctx.prisma.gameEventInstance.findUnique({
        where: { id: input.eventId },
        include: {
          province: {
            include: {
              stocks: true,
              governor: true,
              city: true
            }
          }
        }
      });

      if (!eventInstance || eventInstance.province.city.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      if (eventInstance.resolved) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Event already resolved" });
      }

      // Get event definition
      const eventDefinition = GAME_EVENTS[eventInstance.eventKey];
      if (!eventDefinition) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event definition not found" });
      }

      // Check if choice is valid
      const choice = eventDefinition.choices.find(c => c.id === input.choiceId);
      if (!choice) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid choice" });
      }

      // Build province resources map
      const provinceResources = eventInstance.province.stocks.reduce((acc, stock) => {
        acc[stock.type.toLowerCase()] = stock.amount;
        return acc;
      }, {} as Record<string, number>);

      // Check if player can afford the choice
      const affordabilityCheck = canAffordChoice(input.choiceId, eventDefinition, provinceResources);
      if (!affordabilityCheck.canAfford) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `Insufficient resources: ${affordabilityCheck.missingResources?.map(r => 
            `${r.resource}: need ${r.needed}, have ${r.have}`
          ).join(', ')}` 
        });
      }

      // Build province context for processing
      const provinceContext = {
        id: eventInstance.province.id,
        name: eventInstance.province.name,
        level: eventInstance.province.level,
        threat: eventInstance.province.threat,
        buildings: [],
        resources: provinceResources,
        governor: eventInstance.province.governor
      };

      // Process the choice
      const outcome = processEventChoice(input.choiceId, eventDefinition, provinceContext);

      // Apply resource changes
      const updatePromises = Object.entries(outcome.resourceChanges).map(async ([resource, change]) => {
        if (change === 0) return null;

        const resourceType = resource.toUpperCase() as any;
        const stock = eventInstance.province.stocks.find(s => s.type === resourceType);
        
        if (stock) {
          const newAmount = Math.max(0, stock.amount + change);
          return ctx.prisma.resourceStock.update({
            where: { id: stock.id },
            data: { amount: newAmount }
          });
        }
        return null;
      });

      await Promise.all(updatePromises);

      // Update governor if applicable
      if (eventInstance.province.governor && (outcome.governorLoyaltyChange !== 0 || outcome.governorXpGain !== 0)) {
        await ctx.prisma.governor.update({
          where: { id: eventInstance.province.governor.id },
          data: {
            loyalty: Math.max(0, Math.min(100, eventInstance.province.governor.loyalty + outcome.governorLoyaltyChange)),
            xp: eventInstance.province.governor.xp + outcome.governorXpGain
          }
        });
      }

      // Create temporary effect if needed
      if (outcome.temporaryEffect) {
        await ctx.prisma.temporaryEffect.create({
          data: {
            provinceId: eventInstance.province.id,
            eventId: eventInstance.id,
            type: outcome.temporaryEffect.type,
            effect: outcome.temporaryEffect.effect,
            expiresAt: new Date(Date.now() + outcome.temporaryEffect.duration * 60 * 60 * 1000)
          }
        });
      }

      // Mark event as resolved
      await ctx.prisma.gameEventInstance.update({
        where: { id: input.eventId },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          choiceId: input.choiceId,
          resourcesGained: outcome.resourceChanges,
          governorLoyaltyChange: outcome.governorLoyaltyChange,
          governorXpGained: outcome.governorXpGain,
          followupScheduled: outcome.scheduleFollowup
        }
      });

      return {
        success: true,
        message: outcome.message,
        resourceChanges: outcome.resourceChanges,
        governorChanges: {
          loyaltyChange: outcome.governorLoyaltyChange,
          xpGain: outcome.governorXpGain
        }
      };
    }),

  // Get event history for a province
  getEventHistory: protectedProcedure
    .input(z.object({ 
      provinceId: z.string().optional(),
      limit: z.number().min(1).max(50).default(20)
    }))
    .query(async ({ ctx, input }) => {
      const whereCondition: any = {
        province: { city: { userId: ctx.userId } },
        resolved: true
      };

      if (input.provinceId) {
        whereCondition.provinceId = input.provinceId;
      }

      const events = await ctx.prisma.gameEventInstance.findMany({
        where: whereCondition,
        include: {
          province: { select: { name: true } }
        },
        orderBy: { resolvedAt: 'desc' },
        take: input.limit
      });

      return events.map(event => ({
        ...event,
        eventData: GAME_EVENTS[event.eventKey]
      }));
    })
});