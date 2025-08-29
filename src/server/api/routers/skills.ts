import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { SKILL_DATA, getSkillEffects, checkSkillRequirements } from "@/lib/skill-data";
import { SeasonManager } from "@/lib/season-manager";

export const skillsRouter = createTRPCRouter({
  // Get player's skills with unlock status
  getPlayerSkills: protectedProcedure.query(async ({ ctx }) => {
    const city = await ctx.prisma.city.findUnique({
      where: { userId: ctx.userId },
      include: {
        researchedTechnologies: true,
        provinces: {
          include: {
            buildings: true,
          },
        },
      },
    });

    if (!city) {
      throw new Error("City not found");
    }

    // Get player skills
    const playerSkills = await ctx.prisma.playerSkill.findMany({
      where: { userId: ctx.userId },
      include: { skill: true },
    });

    // Calculate user level based on total building levels
    const totalBuildingLevels = city.provinces.reduce((total, province) => {
      return total + province.buildings.reduce((sum, building) => sum + building.level, 0);
    }, 0);
    const userLevel = Math.max(1, Math.floor(totalBuildingLevels / 5) + 1); // Level = buildings / 5 + 1

    // Get unlocked technologies
    const unlockedTechs = city.researchedTechnologies.map(tech => tech.techKey);
    const unlockedSkills = playerSkills.filter(ps => ps.isUnlocked).map(ps => ps.skill.key);

    // Process all available skills
    const allSkills = Object.values(SKILL_DATA).map(skillData => {
      const playerSkill = playerSkills.find(ps => ps.skill.key === skillData.key);
      const requirements = checkSkillRequirements(skillData.key, userLevel, unlockedTechs, unlockedSkills);
      
      const level = playerSkill?.level || 1;
      const scaledSkill = getSkillEffects(skillData.key, level);

      return {
        ...skillData,
        ...scaledSkill,
        playerSkill: playerSkill || null,
        isUnlocked: playerSkill?.isUnlocked || false,
        canUnlock: requirements.canUnlock,
        missingRequirements: requirements.missingRequirements,
        isOnCooldown: playerSkill?.isOnCooldown || false,
        cooldownExpiresAt: playerSkill?.cooldownExpiresAt,
        level: level,
        experience: playerSkill?.experience || 0,
        timesUsed: playerSkill?.timesUsed || 0,
      };
    });

    // Get current resources (including new Mana and Energy)
    const resources = await ctx.prisma.resourceStock.findMany({
      where: {
        province: {
          city: {
            userId: ctx.userId
          }
        }
      }
    });

    const totalResources = resources.reduce((acc, stock) => {
      const key = stock.type.toLowerCase();
      acc[key] = (acc[key] || 0) + stock.amount;
      return acc;
    }, {} as Record<string, number>);

    // Add default values for new resources
    totalResources.mana = totalResources.mana || 0;
    totalResources.energy = totalResources.energy || 100; // Default energy

    return {
      skills: allSkills,
      playerLevel: userLevel,
      resources: totalResources,
      unlockedCount: unlockedSkills.length,
    };
  }),

  // Unlock a new skill
  unlockSkill: protectedProcedure
    .input(z.object({ skillKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const skill = SKILL_DATA[input.skillKey];
      if (!skill) {
        throw new Error("Skill not found");
      }

      // Check if skill is already unlocked
      const existingSkill = await ctx.prisma.playerSkill.findUnique({
        where: {
          userId_skillId: {
            userId: ctx.userId,
            skillId: input.skillKey
          }
        }
      });

      if (existingSkill?.isUnlocked) {
        throw new Error("Skill already unlocked");
      }

      const city = await ctx.prisma.city.findUnique({
        where: { userId: ctx.userId },
        include: { 
          researchedTechnologies: true,
          provinces: {
            include: {
              buildings: true,
            },
          },
        }
      });

      if (!city) {
        throw new Error("City not found");
      }

      // Check requirements - calculate level from buildings
      const totalBuildingLevels = city.provinces.reduce((total, province) => {
        return total + province.buildings.reduce((sum, building) => sum + building.level, 0);
      }, 0);
      const userLevel = Math.max(1, Math.floor(totalBuildingLevels / 5) + 1);
      const unlockedTechs = city.researchedTechnologies.map(tech => tech.techKey);
      const unlockedSkills = await ctx.prisma.playerSkill.findMany({
        where: { userId: ctx.userId, isUnlocked: true },
        include: { skill: true }
      }).then(skills => skills.map(s => s.skill.key));

      const requirements = checkSkillRequirements(input.skillKey, userLevel, unlockedTechs, unlockedSkills);
      
      if (!requirements.canUnlock) {
        throw new Error(`Requirements not met: ${requirements.missingRequirements.join(", ")}`);
      }

      // Create or update skill entry first
      let skillRecord = await ctx.prisma.skill.findUnique({
        where: { key: input.skillKey }
      });

      if (!skillRecord) {
        skillRecord = await ctx.prisma.skill.create({
          data: {
            key: skill.key,
            name: skill.name,
            description: skill.description,
            category: skill.category,
            type: skill.type,
            requiredLevel: skill.requiredLevel,
            requiredTechs: skill.requiredTechs,
            prerequisites: skill.prerequisites,
            cooldownSeconds: skill.cooldownSeconds,
            energyCost: skill.energyCost,
            manaCost: skill.manaCost,
            resourceCosts: skill.resourceCosts,
            effects: skill.effects,
            duration: skill.duration,
            maxLevel: skill.maxLevel,
          }
        });
      }

      // Unlock the skill for the player
      const playerSkill = await ctx.prisma.playerSkill.upsert({
        where: {
          userId_skillId: {
            userId: ctx.userId,
            skillId: skillRecord.id
          }
        },
        create: {
          userId: ctx.userId,
          skillId: skillRecord.id,
          isUnlocked: true,
          unlockedAt: new Date(),
        },
        update: {
          isUnlocked: true,
          unlockedAt: new Date(),
        },
        include: { skill: true }
      });

      return {
        success: true,
        skill: playerSkill,
        message: `${skill.name} unlocked!`
      };
    }),

  // Use an active skill
  useSkill: protectedProcedure
    .input(z.object({
      skillKey: z.string(),
      targetType: z.string().optional(),
      targetId: z.string().optional(),
      context: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const skill = SKILL_DATA[input.skillKey];
      if (!skill) {
        throw new Error("Skill not found");
      }

      // Get player skill
      const playerSkill = await ctx.prisma.playerSkill.findFirst({
        where: {
          userId: ctx.userId,
          skill: { key: input.skillKey },
          isUnlocked: true,
        },
        include: { skill: true }
      });

      if (!playerSkill) {
        throw new Error("Skill not unlocked");
      }

      // Check cooldown
      if (playerSkill.isOnCooldown && playerSkill.cooldownExpiresAt && playerSkill.cooldownExpiresAt > new Date()) {
        const remainingSeconds = Math.ceil((playerSkill.cooldownExpiresAt.getTime() - Date.now()) / 1000);
        throw new Error(`Skill on cooldown for ${remainingSeconds} seconds`);
      }

      // Get current resources
      const resources = await ctx.prisma.resourceStock.findMany({
        where: {
          province: {
            city: {
              userId: ctx.userId
            }
          }
        }
      });

      const totalResources = resources.reduce((acc, stock) => {
        const key = stock.type.toLowerCase();
        acc[key] = (acc[key] || 0) + stock.amount;
        return acc;
      }, {} as Record<string, number>);

      // Add defaults for new resources
      totalResources.energy = totalResources.energy || 100;
      totalResources.mana = totalResources.mana || 0;

      // Get scaled skill effects
      const scaledSkill = getSkillEffects(input.skillKey, playerSkill.level);
      if (!scaledSkill) {
        throw new Error("Could not calculate skill effects");
      }

      // Check resource costs
      if (totalResources.energy < scaledSkill.energyCost) {
        throw new Error(`Not enough energy: need ${scaledSkill.energyCost}, have ${totalResources.energy}`);
      }

      if (totalResources.mana < scaledSkill.manaCost) {
        throw new Error(`Not enough mana: need ${scaledSkill.manaCost}, have ${totalResources.mana}`);
      }

      for (const [resource, cost] of Object.entries(scaledSkill.resourceCosts)) {
        if ((totalResources[resource] || 0) < cost) {
          throw new Error(`Not enough ${resource}: need ${cost}, have ${totalResources[resource] || 0}`);
        }
      }

      // Deduct resource costs (simplified - in reality we'd distribute across provinces)
      if (scaledSkill.energyCost > 0) {
        // Energy is empire-wide, deduct from first province or create if needed
        const firstProvince = await ctx.prisma.province.findFirst({
          where: { city: { userId: ctx.userId } }
        });

        if (firstProvince) {
          await ctx.prisma.resourceStock.upsert({
            where: {
              provinceId_type: {
                provinceId: firstProvince.id,
                type: "ENERGY"
              }
            },
            create: {
              provinceId: firstProvince.id,
              type: "ENERGY",
              amount: Math.max(0, 100 - scaledSkill.energyCost)
            },
            update: {
              amount: { decrement: scaledSkill.energyCost }
            }
          });
        }
      }

      // Apply skill effects (simplified implementation)
      const effectsApplied = await applySkillEffects(ctx, scaledSkill, input.targetType, input.targetId);

      // Set cooldown
      const cooldownExpires = new Date(Date.now() + scaledSkill.cooldownSeconds * 1000);
      
      await ctx.prisma.playerSkill.update({
        where: { id: playerSkill.id },
        data: {
          isOnCooldown: true,
          cooldownExpiresAt: cooldownExpires,
          timesUsed: { increment: 1 },
          lastUsedAt: new Date(),
          experience: { increment: 10 }, // Gain XP for using skill
        }
      });

      // Log skill usage
      await ctx.prisma.skillUsage.create({
        data: {
          userId: ctx.userId,
          skillId: playerSkill.skillId,
          targetType: input.targetType,
          targetId: input.targetId,
          context: input.context || {},
          effects: effectsApplied,
          resourcesUsed: {
            energy: scaledSkill.energyCost,
            mana: scaledSkill.manaCost,
            ...scaledSkill.resourceCosts
          }
        }
      });

      return {
        success: true,
        effects: effectsApplied,
        cooldownExpires,
        message: `${scaledSkill.name} activated!`,
        experienceGained: 10,
      };
    }),

  // Get skill usage history
  getSkillHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const history = await ctx.prisma.skillUsage.findMany({
        where: { userId: ctx.userId },
        include: { skill: true },
        orderBy: { usedAt: "desc" },
        take: input.limit,
      });

      return history.map(usage => ({
        id: usage.id,
        skillName: usage.skill.name,
        skillKey: usage.skill.key,
        effects: usage.effects,
        success: usage.success,
        usedAt: usage.usedAt,
        resourcesUsed: usage.resourcesUsed,
      }));
    }),
});

// Helper function to apply skill effects
async function applySkillEffects(
  ctx: any,
  skill: any,
  targetType?: string,
  targetId?: string
) {
  const effectsApplied = [];

  for (const effect of skill.effects) {
    switch (effect.type) {
      case "PRODUCTION_MULTIPLIER":
        // This would integrate with the existing production system
        effectsApplied.push({
          type: "PRODUCTION_BOOST",
          value: effect.value,
          duration: effect.duration,
          appliedAt: new Date(),
        });
        break;

      case "INSTANT_PRODUCTION":
        // Immediately add resources based on current production rates
        effectsApplied.push({
          type: "INSTANT_RESOURCES",
          value: "2 hours of production",
          appliedAt: new Date(),
        });
        break;

      case "COST_REDUCTION":
        // This would affect future construction/research costs
        effectsApplied.push({
          type: "COST_REDUCTION_BUFF",
          value: effect.value,
          duration: effect.duration,
          appliedAt: new Date(),
        });
        break;

      case "RESTORE_MANA":
        // Restore mana immediately
        const provinces = await ctx.prisma.province.findMany({
          where: { city: { userId: ctx.userId } }
        });

        for (const province of provinces.slice(0, 1)) { // Just first province for now
          await ctx.prisma.resourceStock.upsert({
            where: {
              provinceId_type: {
                provinceId: province.id,
                type: "MANA"
              }
            },
            create: {
              provinceId: province.id,
              type: "MANA",
              amount: effect.value
            },
            update: {
              amount: { increment: effect.value }
            }
          });
        }

        effectsApplied.push({
          type: "MANA_RESTORED",
          value: effect.value,
          appliedAt: new Date(),
        });
        break;

      default:
        effectsApplied.push({
          type: effect.type,
          value: effect.value,
          duration: effect.duration,
          appliedAt: new Date(),
        });
    }
  }

  return effectsApplied;
}