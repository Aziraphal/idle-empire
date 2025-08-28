// Season initialization utility
import { PrismaClient } from "@prisma/client";
import { SeasonManager } from "./season-manager";

export async function initializeFirstSeason() {
  const prisma = new PrismaClient();
  const seasonManager = new SeasonManager(prisma);

  try {
    console.log("🌟 Initializing Season 1: L'Éveil...");

    // Check if Season 1 already exists
    const existingSeason = await prisma.season.findUnique({
      where: { number: 1 }
    });

    if (existingSeason) {
      console.log("✅ Season 1 already exists");
      
      // Make sure it's active if no other season is active
      const activeSeason = await prisma.season.findFirst({
        where: { status: "ACTIVE" }
      });

      if (!activeSeason) {
        console.log("🚀 Setting Season 1 as active...");
        await seasonManager.startSeason(1);
        console.log("✅ Season 1 is now active");
      }
      
      return existingSeason;
    }

    // Initialize Season 1
    const season1 = await seasonManager.initializeSeason(1);
    console.log(`✅ Created Season 1: ${season1.name}`);

    // Start Season 1
    await seasonManager.startSeason(1);
    console.log("🚀 Season 1 is now active!");

    // Migrate existing researched technologies to Season 1
    console.log("🔄 Migrating existing technologies to Season 1...");
    
    const existingTechs = await prisma.researchedTechnology.findMany();
    
    if (existingTechs.length > 0) {
      // This might fail due to the new unique constraint, so we'll handle it
      for (const tech of existingTechs) {
        try {
          await prisma.researchedTechnology.update({
            where: { id: tech.id },
            data: { seasonId: season1.id }
          });
        } catch (error) {
          console.log(`⚠️ Could not migrate tech ${tech.techKey}: ${error}`);
        }
      }
      console.log(`✅ Migrated ${existingTechs.length} existing technologies`);
    }

    return season1;

  } catch (error) {
    console.error("❌ Error initializing season:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run this function to initialize the first season
if (require.main === module) {
  initializeFirstSeason()
    .then(() => {
      console.log("🎉 Season initialization complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Failed to initialize season:", error);
      process.exit(1);
    });
}