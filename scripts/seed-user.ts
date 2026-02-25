/**
 * Seed script for local development
 *
 * Creates a default test user when the database is first created.
 * This is ONLY used for local development (`pnpm dev`).
 *
 * Credentials: test@test.com / password
 */

import { PrismaClient } from "../server/src/generated/prisma/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_USER = {
	email: "test@test.com",
	password: "password",
	name: "Test User",
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
}

seedUser()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
