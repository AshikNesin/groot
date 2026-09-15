import bcrypt from "bcryptjs";
import { Boom } from "@groot/core/errors";
import { prisma } from "@groot/core/database";
import type { User } from "@groot/core/database";
import { generateToken } from "@groot/core/utils/jwt.utils";
import type { CreateUserDTO, LoginDTO } from "./auth.schema";

const DUMMY_HASH = "$2a$10$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export async function findUserById(id: number): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

// ── Auth service ───────────────────────────────────────────────────────────

export async function login(data: LoginDTO) {
  const user = await findUserByEmail(data.email);
  const hash = user?.password ?? DUMMY_HASH;
  const isValid = await bcrypt.compare(data.password, hash);

  if (!user || !isValid) {
    throw Boom.unauthorized("Invalid email or password");
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

export async function createUser(data: CreateUserDTO) {
  const existingUser = await findUserByEmail(data.email);

  if (existingUser) {
    throw Boom.conflict("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export async function getUserById({ userId }: { userId: number }) {
  const user = await findUserById(userId);

  if (!user) {
    throw Boom.notFound(`User with identifier '${userId}' not found`);
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });
}
