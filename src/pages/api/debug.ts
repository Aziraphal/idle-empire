import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Test database connection
    console.log("Testing database connection...");
    
    // Simple test query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("Database query result:", result);

    // Test if User table exists
    const userCount = await prisma.user.count();
    console.log("User count:", userCount);

    res.status(200).json({ 
      status: "ok", 
      database: "connected",
      userCount,
      testQuery: result,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error("Database error:", error);
    
    res.status(500).json({ 
      status: "error", 
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString() 
    });
  } finally {
    await prisma.$disconnect();
  }
}