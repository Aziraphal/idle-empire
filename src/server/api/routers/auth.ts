import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        username: z.string().min(3).max(20),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.prisma.user.findFirst({
        where: {
          OR: [{ email: input.email }, { username: input.username }],
        },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email or username already exists",
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create user
      const user = await ctx.prisma.user.create({
        data: {
          email: input.email,
          username: input.username,
          passwordHash,
        },
      });

      // Create default city and province
      const city = await ctx.prisma.city.create({
        data: {
          name: `${input.username}'s Empire`,
          userId: user.id,
        },
      });

      const province = await ctx.prisma.province.create({
        data: {
          name: "Capital Province",
          cityId: city.id,
          level: 1,
          threat: 5,
        },
      });

      // Initialize resource stocks
      const resourceTypes = ["GOLD", "FOOD", "STONE", "IRON", "POP", "INFLUENCE"] as const;
      const initialAmounts = [200, 500, 150, 100, 25, 10];

      for (let i = 0; i < resourceTypes.length; i++) {
        await ctx.prisma.resourceStock.create({
          data: {
            provinceId: province.id,
            type: resourceTypes[i],
            amount: initialAmounts[i],
          },
        });
      }

      // Create JWT token
      const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, {
        expiresIn: "30d",
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        emailOrUsername: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find user by email or username
      const user = await ctx.prisma.user.findFirst({
        where: {
          OR: [
            { email: input.emailOrUsername },
            { username: input.emailOrUsername },
          ],
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(
        input.password,
        user.passwordHash
      );

      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
        });
      }

      // Create JWT token
      const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, {
        expiresIn: "30d",
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      };
    }),
});