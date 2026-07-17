import { prisma } from "@groot/core/database";
import bcrypt from "bcryptjs";

const SEED_USER = {
  email: "demo@example.com",
  password: "demo@example.com",
  name: "Demo User",
};

async function globalSetup() {
  // Reuse the app's Prisma singleton (constructed in
  // packages/core/src/database/client.ts), which already selects the right
  // adapter for DATABASE_ENGINE. The dev server (started separately by
  // Playwright's webServer) points at the same DATABASE_URL, so the seed user
  // is visible to it.
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
