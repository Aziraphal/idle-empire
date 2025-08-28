// Alliance Management System
import { PrismaClient, AllianceRole, AllianceInvitationStatus, DiplomacyStatus, DiplomacyActionType } from "@prisma/client";

export class AllianceManager {
  constructor(private prisma: PrismaClient) {}

  // Create a new alliance
  async createAlliance(
    leaderId: string,
    data: {
      name: string;
      tag: string;
      description?: string;
      isPublic?: boolean;
      maxMembers?: number;
      minLevel?: number;
    }
  ) {
    // Check if user is already in an alliance
    const existingMembership = await this.prisma.allianceMember.findUnique({
      where: { userId: leaderId }
    });

    if (existingMembership) {
      throw new Error("You are already a member of an alliance");
    }

    // Check if alliance name or tag already exists
    const existingAlliance = await this.prisma.alliance.findFirst({
      where: {
        OR: [
          { name: data.name },
          { tag: data.tag }
        ]
      }
    });

    if (existingAlliance) {
      throw new Error("Alliance name or tag already exists");
    }

    // Create alliance and add leader as member
    const alliance = await this.prisma.alliance.create({
      data: {
        name: data.name,
        tag: data.tag,
        description: data.description,
        isPublic: data.isPublic ?? true,
        maxMembers: data.maxMembers ?? 50,
        minLevel: data.minLevel ?? 1,
        leaderId,
        members: {
          create: {
            userId: leaderId,
            role: AllianceRole.LEADER,
            joinedAt: new Date(),
          }
        },
        activities: {
          create: {
            activityType: "ALLIANCE_CREATED",
            description: `Alliance ${data.name} [${data.tag}] was founded`,
            userId: leaderId,
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                username: true
              }
            }
          }
        },
        leader: {
          select: {
            username: true
          }
        }
      }
    });

    return alliance;
  }

  // Get alliance details
  async getAlliance(allianceId: string) {
    return await this.prisma.alliance.findUnique({
      where: { id: allianceId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                createdAt: true,
              }
            }
          },
          orderBy: [
            { role: "asc" }, // Leaders first
            { joinedAt: "asc" }
          ]
        },
        leader: {
          select: {
            id: true,
            username: true
          }
        },
        activities: {
          take: 20,
          orderBy: { createdAt: "desc" }
        },
        diplomaticRelations: {
          include: {
            targetAlliance: {
              select: {
                id: true,
                name: true,
                tag: true
              }
            }
          }
        },
        receivedDiplomacy: {
          include: {
            sourceAlliance: {
              select: {
                id: true,
                name: true,
                tag: true
              }
            }
          }
        }
      }
    });
  }

  // Get user's alliance
  async getUserAlliance(userId: string) {
    const membership = await this.prisma.allianceMember.findUnique({
      where: { userId },
      include: {
        alliance: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    createdAt: true
                  }
                }
              }
            },
            leader: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    return membership;
  }

  // Invite user to alliance
  async inviteUser(
    allianceId: string,
    senderId: string,
    receiverUsername: string,
    message?: string
  ) {
    // Check sender permissions
    const senderMembership = await this.prisma.allianceMember.findFirst({
      where: {
        userId: senderId,
        allianceId,
        role: { in: [AllianceRole.LEADER, AllianceRole.OFFICER] }
      },
      include: { alliance: true }
    });

    if (!senderMembership) {
      throw new Error("You don't have permission to invite members");
    }

    // Find receiver
    const receiver = await this.prisma.user.findUnique({
      where: { username: receiverUsername }
    });

    if (!receiver) {
      throw new Error("User not found");
    }

    // Check if receiver is already in an alliance
    const receiverMembership = await this.prisma.allianceMember.findUnique({
      where: { userId: receiver.id }
    });

    if (receiverMembership) {
      throw new Error("User is already a member of an alliance");
    }

    // Check if invitation already exists
    const existingInvitation = await this.prisma.allianceInvitation.findUnique({
      where: {
        allianceId_receiverId: {
          allianceId,
          receiverId: receiver.id
        }
      }
    });

    if (existingInvitation && existingInvitation.status === AllianceInvitationStatus.PENDING) {
      throw new Error("Invitation already sent to this user");
    }

    // Create invitation
    const invitation = await this.prisma.allianceInvitation.create({
      data: {
        allianceId,
        senderId,
        receiverId: receiver.id,
        message,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        alliance: {
          select: {
            name: true,
            tag: true
          }
        },
        sender: {
          select: {
            username: true
          }
        }
      }
    });

    // Log activity
    await this.prisma.allianceActivity.create({
      data: {
        allianceId,
        activityType: "INVITATION_SENT",
        description: `${senderMembership.alliance.name} invited ${receiver.username}`,
        userId: senderId,
      }
    });

    return invitation;
  }

  // Respond to invitation
  async respondToInvitation(
    invitationId: string,
    userId: string,
    accept: boolean
  ) {
    const invitation = await this.prisma.allianceInvitation.findFirst({
      where: {
        id: invitationId,
        receiverId: userId,
        status: AllianceInvitationStatus.PENDING,
        expiresAt: { gt: new Date() }
      },
      include: {
        alliance: true
      }
    });

    if (!invitation) {
      throw new Error("Invitation not found or expired");
    }

    // Check if user is already in an alliance
    const existingMembership = await this.prisma.allianceMember.findUnique({
      where: { userId }
    });

    if (existingMembership) {
      throw new Error("You are already a member of an alliance");
    }

    if (accept) {
      // Check alliance capacity
      if (invitation.alliance.memberCount >= invitation.alliance.maxMembers) {
        throw new Error("Alliance is full");
      }

      // Accept invitation and create membership
      await this.prisma.$transaction(async (tx) => {
        // Update invitation status
        await tx.allianceInvitation.update({
          where: { id: invitationId },
          data: {
            status: AllianceInvitationStatus.ACCEPTED,
            respondedAt: new Date()
          }
        });

        // Create membership
        await tx.allianceMember.create({
          data: {
            userId,
            allianceId: invitation.allianceId,
            role: AllianceRole.MEMBER,
            joinedAt: new Date(),
          }
        });

        // Update alliance member count
        await tx.alliance.update({
          where: { id: invitation.allianceId },
          data: {
            memberCount: { increment: 1 }
          }
        });

        // Log activity
        await tx.allianceActivity.create({
          data: {
            allianceId: invitation.allianceId,
            activityType: "MEMBER_JOINED",
            description: `New member joined the alliance`,
            userId,
          }
        });
      });
    } else {
      // Decline invitation
      await this.prisma.allianceInvitation.update({
        where: { id: invitationId },
        data: {
          status: AllianceInvitationStatus.DECLINED,
          respondedAt: new Date()
        }
      });
    }

    return { success: true, accepted: accept };
  }

  // Leave alliance
  async leaveAlliance(userId: string) {
    const membership = await this.prisma.allianceMember.findUnique({
      where: { userId },
      include: { alliance: true }
    });

    if (!membership) {
      throw new Error("You are not a member of any alliance");
    }

    if (membership.role === AllianceRole.LEADER) {
      // Leaders can't leave unless they transfer leadership or dissolve alliance
      const memberCount = await this.prisma.allianceMember.count({
        where: { allianceId: membership.allianceId }
      });

      if (memberCount > 1) {
        throw new Error("Leaders must transfer leadership before leaving or dissolve the alliance");
      }

      // If leader is the only member, dissolve alliance
      await this.dissolveAlliance(membership.allianceId, userId);
      return { dissolved: true };
    }

    // Remove membership and update counts
    await this.prisma.$transaction(async (tx) => {
      await tx.allianceMember.delete({
        where: { userId }
      });

      await tx.alliance.update({
        where: { id: membership.allianceId },
        data: {
          memberCount: { decrement: 1 }
        }
      });

      await tx.allianceActivity.create({
        data: {
          allianceId: membership.allianceId,
          activityType: "MEMBER_LEFT",
          description: `A member left the alliance`,
          userId,
        }
      });
    });

    return { success: true };
  }

  // Kick member (officers and leaders only)
  async kickMember(allianceId: string, kickerId: string, targetUserId: string, reason?: string) {
    const kickerMembership = await this.prisma.allianceMember.findFirst({
      where: {
        userId: kickerId,
        allianceId,
        role: { in: [AllianceRole.LEADER, AllianceRole.OFFICER] }
      }
    });

    if (!kickerMembership) {
      throw new Error("You don't have permission to kick members");
    }

    const targetMembership = await this.prisma.allianceMember.findFirst({
      where: {
        userId: targetUserId,
        allianceId
      },
      include: {
        user: {
          select: { username: true }
        }
      }
    });

    if (!targetMembership) {
      throw new Error("Target user is not a member of this alliance");
    }

    // Can't kick leaders, officers can't kick other officers
    if (targetMembership.role === AllianceRole.LEADER) {
      throw new Error("Cannot kick alliance leader");
    }

    if (kickerMembership.role === AllianceRole.OFFICER && targetMembership.role === AllianceRole.OFFICER) {
      throw new Error("Officers cannot kick other officers");
    }

    // Remove membership
    await this.prisma.$transaction(async (tx) => {
      await tx.allianceMember.delete({
        where: { userId: targetUserId }
      });

      await tx.alliance.update({
        where: { id: allianceId },
        data: {
          memberCount: { decrement: 1 }
        }
      });

      await tx.allianceActivity.create({
        data: {
          allianceId,
          activityType: "MEMBER_KICKED",
          description: `${targetMembership.user.username} was removed from the alliance${reason ? `: ${reason}` : ''}`,
          userId: kickerId,
        }
      });
    });

    return { success: true };
  }

  // Promote/demote member
  async changeRole(allianceId: string, changerId: string, targetUserId: string, newRole: AllianceRole) {
    const changerMembership = await this.prisma.allianceMember.findFirst({
      where: {
        userId: changerId,
        allianceId,
        role: AllianceRole.LEADER // Only leaders can change roles
      }
    });

    if (!changerMembership) {
      throw new Error("Only alliance leaders can change member roles");
    }

    const targetMembership = await this.prisma.allianceMember.findFirst({
      where: {
        userId: targetUserId,
        allianceId
      },
      include: {
        user: {
          select: { username: true }
        }
      }
    });

    if (!targetMembership) {
      throw new Error("Target user is not a member of this alliance");
    }

    if (targetUserId === changerId) {
      throw new Error("Cannot change your own role");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.allianceMember.update({
        where: { userId: targetUserId },
        data: { role: newRole }
      });

      const roleNames = {
        [AllianceRole.LEADER]: "Leader",
        [AllianceRole.OFFICER]: "Officer",
        [AllianceRole.MEMBER]: "Member"
      };

      await tx.allianceActivity.create({
        data: {
          allianceId,
          activityType: "ROLE_CHANGED",
          description: `${targetMembership.user.username} was promoted to ${roleNames[newRole]}`,
          userId: changerId,
        }
      });
    });

    return { success: true };
  }

  // Transfer leadership
  async transferLeadership(allianceId: string, currentLeaderId: string, newLeaderId: string) {
    const currentLeader = await this.prisma.allianceMember.findFirst({
      where: {
        userId: currentLeaderId,
        allianceId,
        role: AllianceRole.LEADER
      }
    });

    if (!currentLeader) {
      throw new Error("You are not the leader of this alliance");
    }

    const newLeader = await this.prisma.allianceMember.findFirst({
      where: {
        userId: newLeaderId,
        allianceId
      },
      include: {
        user: {
          select: { username: true }
        }
      }
    });

    if (!newLeader) {
      throw new Error("Target user is not a member of this alliance");
    }

    await this.prisma.$transaction(async (tx) => {
      // Change old leader to officer
      await tx.allianceMember.update({
        where: { userId: currentLeaderId },
        data: { role: AllianceRole.OFFICER }
      });

      // Promote new leader
      await tx.allianceMember.update({
        where: { userId: newLeaderId },
        data: { role: AllianceRole.LEADER }
      });

      // Update alliance leader
      await tx.alliance.update({
        where: { id: allianceId },
        data: { leaderId: newLeaderId }
      });

      await tx.allianceActivity.create({
        data: {
          allianceId,
          activityType: "LEADERSHIP_TRANSFERRED",
          description: `Leadership transferred to ${newLeader.user.username}`,
          userId: currentLeaderId,
        }
      });
    });

    return { success: true };
  }

  // Dissolve alliance (leader only)
  async dissolveAlliance(allianceId: string, leaderId: string) {
    const leader = await this.prisma.allianceMember.findFirst({
      where: {
        userId: leaderId,
        allianceId,
        role: AllianceRole.LEADER
      },
      include: { alliance: true }
    });

    if (!leader) {
      throw new Error("Only alliance leaders can dissolve the alliance");
    }

    // Delete alliance (cascading deletes will handle members, invitations, etc.)
    await this.prisma.alliance.delete({
      where: { id: allianceId }
    });

    return { success: true };
  }

  // Get alliance rankings
  async getAllianceRankings(limit = 100) {
    return await this.prisma.alliance.findMany({
      take: limit,
      orderBy: { totalPower: "desc" },
      include: {
        leader: {
          select: {
            username: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      }
    });
  }

  // Search alliances
  async searchAlliances(query: string, limit = 20) {
    return await this.prisma.alliance.findMany({
      where: {
        AND: [
          { isPublic: true },
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { tag: { contains: query, mode: "insensitive" } },
            ]
          }
        ]
      },
      take: limit,
      include: {
        leader: {
          select: {
            username: true
          }
        }
      },
      orderBy: { totalPower: "desc" }
    });
  }

  // Update alliance stats (called periodically)
  async updateAllianceStats(allianceId: string) {
    const members = await this.prisma.allianceMember.findMany({
      where: { allianceId },
      include: {
        user: {
          include: {
            playerSeasons: {
              where: {
                isActive: true
              },
              take: 1
            }
          }
        }
      }
    });

    const totalPower = members.reduce((sum, member) => {
      const playerSeason = member.user.playerSeasons[0];
      return sum + Number(playerSeason?.totalPower || 0);
    }, 0);

    const avgLevel = members.length > 0 ? 
      members.reduce((sum, member) => sum + 1, 0) / members.length : 1; // Simplified level calculation

    await this.prisma.alliance.update({
      where: { id: allianceId },
      data: {
        totalPower: BigInt(totalPower),
        memberCount: members.length,
        avgLevel,
      }
    });

    return { success: true };
  }

  // Get user's invitations
  async getUserInvitations(userId: string) {
    return await this.prisma.allianceInvitation.findMany({
      where: {
        receiverId: userId,
        status: AllianceInvitationStatus.PENDING,
        expiresAt: { gt: new Date() }
      },
      include: {
        alliance: {
          select: {
            id: true,
            name: true,
            tag: true,
            memberCount: true,
            maxMembers: true,
            totalPower: true,
          }
        },
        sender: {
          select: {
            username: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }
}