import { PrismaClient } from "../../server/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const SEED_USER = {
  email: "demo@example.com",
  password: "password123",
  name: "Demo User",
};

async function globalSetup() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  const prisma = new PrismaClient({ adapter });

  const hashedPassword = await bcrypt.hash(SEED_USER.password, 10);
  await prisma.user.upsert({
    where: { email: SEED_USER.email },
    update: {},
    create: {
      email: SEED_USER.email,
      name: SEED_USER.name,
      password: hashedPassword,
    },
  });

  console.log("E2E seed: test user ready");

  await prisma.$disconnect();
}

export default globalSetup;
