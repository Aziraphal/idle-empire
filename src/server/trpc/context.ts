import { inferAsyncReturnType } from "@trpc/server";
import { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function createContext(opts: CreateNextContextOptions) {
  const { req } = opts;
  
  // Extract user from JWT if present
  let userId: string | null = null;
  
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
      userId = decoded.sub;
    } catch (error) {
      // Invalid token, userId remains null
    }
  }

  return {
    prisma,
    userId,
    req,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;