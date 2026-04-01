/**
 * Seed script for local development
 *
 * Creates a default test user when the database is first created.
 * This is ONLY used for local development (`pnpm dev`).
 *
 * Credentials: demo@example.com / password123
 */

import { PrismaClient } from "../server/src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({ adapter });

export const SEED_USER = {
  email: "demo@example.com",
  password: "password123",
  name: "Demo User",
};

async function seedUser() {
  const existing = await prisma.user.findUnique({
    where: { email: SEED_USER.email },
  });

  if (existing) {
    console.log("   Seed user already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash(SEED_USER.password, 10);

  await prisma.user.create({
    data: {
      email: SEED_USER.email,
      password: hashedPassword,
      name: SEED_USER.name,
    },
  });

  console.log("   ✅ Seed user created");
  console.log();
  console.log(`   📧 Email:    ${SEED_USER.email}`);
  console.log(`   🔑 Password: ${SEED_USER.password}`);
  console.log();
}

seedUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
