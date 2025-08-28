import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";
import { AllianceManager } from "@/lib/alliance-manager";
import { AllianceRole } from "@prisma/client";

export const alliancesRouter = createTRPCRouter({
  // Create a new alliance
  createAlliance: protectedProcedure
    .input(z.object({
      name: z.string().min(3).max(50),
      tag: z.string().min(2).max(6).regex(/^[A-Z0-9]+$/), // Only uppercase letters and numbers
      description: z.string().max(500).optional(),
      isPublic: z.boolean().default(true),
      maxMembers: z.number().min(5).max(100).default(50),
      minLevel: z.number().min(1).max(100).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const allianceManager = new AllianceManager(ctx.prisma);
      
      const alliance = await allianceManager.createAlliance(ctx.userId, {
        name: input.name,
        tag: input.tag,
        description: input.description,
        isPublic: input.isPublic,
        maxMembers: input.maxMembers,
        minLevel: input.minLevel,
      });

      return alliance;
    }),

  // Get my alliance
  getMyAlliance: protectedProcedure.query(async ({ ctx }) => {
    const allianceManager = new AllianceManager(ctx.prisma);
    const membership = await allianceManager.getUserAlliance(ctx.userId);
    
    if (!membership) {
      return null;
    }

    return {
      ...membership,
      alliance: {
        ...membership.alliance,
        totalPowerFormatted: Number(membership.alliance.totalPower).toLocaleString(),
      }
    };
  }),

  // Get alliance details by ID
  getAlliance: publicProcedure
    .input(z.object({
      allianceId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const allianceManager = new AllianceManager(ctx.prisma);
      const alliance = await allianceManager.getAlliance(input.allianceId);
      
      if (!alliance) {
        throw new Error("Alliance not found");
      }

      return {
        ...alliance,
        totalPowerFormatted: Number(alliance.totalPower).toLocaleString(),
      };
    }),

  // Invite user to alliance
  inviteUser: protectedProcedure
    .input(z.object({
      username: z.string(),
      message: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const allianceManager = new AllianceManager(ctx.prisma);
      
      // Get user's alliance
      const membership = await allianceManager.getUserAlliance(ctx.userId);
      if (!membership) {
        throw new Error("You are not a member of any alliance");
      }

      const invitation = await allianceManager.inviteUser(
        membership.allianceId,
        ctx.userId,
        input.username,
        input.message
      );

      return invitation;
    }),

  // Get my invitations
  getMyInvitations: protectedProcedure.query(async ({ ctx }) => {
    const allianceManager = new AllianceManager(ctx.prisma);
    return await allianceManager.getUserInvitations(ctx.userId);
  }),

  // Respond to invitation
  respondToInvitation: protectedProcedure
    .input(z.object({
      invitationId: z.string(),
      accept: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const allianceManager = new AllianceManager(ctx.prisma);
      
      return await allianceManager.respondToInvitation(
        input.invitationId,
        ctx.userId,
        input.accept
      );
    }),

  // Leave alliance
  leaveAlliance: protectedProcedure.mutation(async ({ ctx }) => {
    const allianceManager = new AllianceManager(ctx.prisma);
    return await allianceManager.leaveAlliance(ctx.userId);
  }),

  // Kick member
  kickMember: protectedProcedure
    .input(z.object({
      targetUserId: z.string(),
      reason: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const allianceManager = new AllianceManager(ctx.prisma);
      
      const membership = await allianceManager.getUserAlliance(ctx.userId);
      if (!membership) {
        throw new Error("You are not a member of any alliance");
      }

      return await allianceManager.kickMember(
        membership.allianceId,
        ctx.userId,
        input.targetUserId,
        input.reason
      );
    }),

  // Change member role
  changeRole: protectedProcedure
    .input(z.object({
      targetUserId: z.string(),
      newRole: z.nativeEnum(AllianceRole),
    }))
    .mutation(async ({ ctx, input }) => {
      const allianceManager = new AllianceManager(ctx.prisma);
      
      const membership = await allianceManager.getUserAlliance(ctx.userId);
      if (!membership) {
        throw new Error("You are not a member of any alliance");
      }

      return await allianceManager.changeRole(
        membership.allianceId,
        ctx.userId,
        input.targetUserId,
        input.newRole
      );
    }),

  // Transfer leadership
  transferLeadership: protectedProcedure
    .input(z.object({
      newLeaderId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const allianceManager = new AllianceManager(ctx.prisma);
      
      const membership = await allianceManager.getUserAlliance(ctx.userId);
      if (!membership) {
        throw new Error("You are not a member of any alliance");
      }

      return await allianceManager.transferLeadership(
        membership.allianceId,
        ctx.userId,
        input.newLeaderId
      );
    }),

  // Dissolve alliance
  dissolveAlliance: protectedProcedure.mutation(async ({ ctx }) => {
    const allianceManager = new AllianceManager(ctx.prisma);
    
    const membership = await allianceManager.getUserAlliance(ctx.userId);
    if (!membership) {
      throw new Error("You are not a member of any alliance");
    }

    return await allianceManager.dissolveAlliance(membership.allianceId, ctx.userId);
  }),

  // Search alliances
  searchAlliances: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const allianceManager = new AllianceManager(ctx.prisma);
      const alliances = await allianceManager.searchAlliances(input.query, input.limit);
      
      return alliances.map(alliance => ({
        ...alliance,
        totalPowerFormatted: Number(alliance.totalPower).toLocaleString(),
      }));
    }),

  // Get alliance rankings
  getRankings: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const allianceManager = new AllianceManager(ctx.prisma);
      const rankings = await allianceManager.getAllianceRankings(input.limit);
      
      return rankings.map((alliance, index) => ({
        ...alliance,
        rank: index + 1,
        totalPowerFormatted: Number(alliance.totalPower).toLocaleString(),
        memberCount: alliance._count.members,
      }));
    }),

  // Update alliance settings (leader only)
  updateSettings: protectedProcedure
    .input(z.object({
      name: z.string().min(3).max(50).optional(),
      description: z.string().max(500).optional(),
      isPublic: z.boolean().optional(),
      maxMembers: z.number().min(5).max(100).optional(),
      minLevel: z.number().min(1).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const allianceManager = new AllianceManager(ctx.prisma);
      
      const membership = await allianceManager.getUserAlliance(ctx.userId);
      if (!membership) {
        throw new Error("You are not a member of any alliance");
      }

      if (membership.role !== AllianceRole.LEADER) {
        throw new Error("Only alliance leaders can update settings");
      }

      // Check if new name is already taken
      if (input.name) {
        const existingAlliance = await ctx.prisma.alliance.findFirst({
          where: {
            name: input.name,
            NOT: { id: membership.allianceId }
          }
        });

        if (existingAlliance) {
          throw new Error("Alliance name already exists");
        }
      }

      const updatedAlliance = await ctx.prisma.alliance.update({
        where: { id: membership.allianceId },
        data: {
          name: input.name,
          description: input.description,
          isPublic: input.isPublic,
          maxMembers: input.maxMembers,
          minLevel: input.minLevel,
        }
      });

      // Log activity
      await ctx.prisma.allianceActivity.create({
        data: {
          allianceId: membership.allianceId,
          activityType: "SETTINGS_UPDATED",
          description: "Alliance settings were updated",
          userId: ctx.userId,
        }
      });

      return updatedAlliance;
    }),

  // Get public alliances list (for browsing)
  getPublicAlliances: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const alliances = await ctx.prisma.alliance.findMany({
        where: { isPublic: true },
        take: input.limit,
        skip: input.offset,
        orderBy: { totalPower: "desc" },
        include: {
          leader: {
            select: {
              username: true
            }
          }
        }
      });

      return alliances.map(alliance => ({
        ...alliance,
        totalPowerFormatted: Number(alliance.totalPower).toLocaleString(),
      }));
    }),

  // Manual stats update (could be called by cron job)
  updateStats: protectedProcedure.mutation(async ({ ctx }) => {
    const allianceManager = new AllianceManager(ctx.prisma);
    
    const membership = await allianceManager.getUserAlliance(ctx.userId);
    if (!membership) {
      throw new Error("You are not a member of any alliance");
    }

    await allianceManager.updateAllianceStats(membership.allianceId);
    return { success: true };
  }),
});