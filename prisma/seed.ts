// prisma/seed.ts
import { PrismaClient, ResourceType, GovernorPersonality } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo user
  const hashedPassword = await bcrypt.hash("demo123", 10);
  
  const user = await prisma.user.upsert({
    where: { email: "demo@idle-empire.com" },
    update: {},
    create: {
      email: "demo@idle-empire.com",
      username: "demo",
      passwordHash: hashedPassword,
    },
  });

  console.log("👤 Demo user created:", user.username);

  // Create city
  const city = await prisma.city.create({
    data: {
      name: "Nova Roma",
      userId: user.id,
    },
  });

  console.log("🏛️ City created:", city.name);

  // Create first province
  const province = await prisma.province.create({
    data: {
      name: "Latium Prima",
      cityId: city.id,
      level: 1,
      threat: 10,
    },
  });

  console.log("🗺️ Province created:", province.name);

  // Initialize resource stocks
  const resources = [
    { type: ResourceType.GOLD, amount: 500 },
    { type: ResourceType.FOOD, amount: 1000 },
    { type: ResourceType.STONE, amount: 300 },
    { type: ResourceType.IRON, amount: 200 },
    { type: ResourceType.POP, amount: 50 },
    { type: ResourceType.INFLUENCE, amount: 25 },
  ];

  for (const resource of resources) {
    await prisma.resourceStock.create({
      data: {
        provinceId: province.id,
        type: resource.type,
        amount: resource.amount,
      },
    });
  }

  console.log("💰 Resource stocks initialized");

  // Create governor
  const governor = await prisma.governor.create({
    data: {
      provinceId: province.id,
      name: "Marcus Aurelius",
      personality: GovernorPersonality.CONSERVATIVE,
      loyalty: 75,
      xp: 0,
    },
  });

  console.log("👨‍💼 Governor created:", governor.name, `(${governor.personality})`);

  // Create some initial buildings
  const buildings = [
    { type: "FARM", level: 2 },
    { type: "MINE", level: 1 },
    { type: "QUARRY", level: 1 },
    { type: "BARRACKS", level: 1 },
  ];

  for (const building of buildings) {
    await prisma.buildingInstance.create({
      data: {
        provinceId: province.id,
        type: building.type,
        level: building.level,
      },
    });
  }

  console.log("🏗️ Initial buildings created");

  // Create a construction task (ongoing)
  await prisma.constructionTask.create({
    data: {
      provinceId: province.id,
      buildingType: "FARM",
      targetLevel: 3,
      startedAt: new Date(),
      finishesAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      status: "PENDING",
    },
  });

  console.log("⏳ Construction task created (Farm upgrade)");

  // Create initial research
  await prisma.researchTask.create({
    data: {
      cityId: city.id,
      techKey: "AGRICULTURE_1",
      startedAt: new Date(),
      finishesAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
      status: "PENDING",
    },
  });

  console.log("🔬 Research task created (Agriculture I)");

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });