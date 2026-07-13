import bcrypt from "bcryptjs";
import { Boom } from "@groot/core/errors";
import { prisma } from "@groot/core/database";
import type { User } from "@groot/core/database";
import { generateToken } from "@groot/core/utils/jwt.utils";
import type { CreateUserDTO, LoginDTO } from "./auth.validation";

const DUMMY_HASH = "$2a$10$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

interface CreateUserData {
  email: string;
  password: string;
  name?: string;
}

export async function findUserById(id: number): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUserRecord(data: CreateUserData): Promise<User> {
  return prisma.user.create({
    data: {
      email: data.email,
      password: data.password,
      name: data.name,
    },
  });
}

export async function deleteUserRecord(id: number): Promise<User> {
  return prisma.user.delete({ where: { id } });
}

export async function findAllUsers(): Promise<Pick<User, "id" | "email" | "name" | "createdAt">[]> {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });
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

  const user = await createUserRecord({
    email: data.email,
    password: hashedPassword,
    name: data.name,
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
  return findAllUsers();
}

export async function deleteUser({ userId }: { userId: number }) {
  const user = await findUserById(userId);

  if (!user) {
    throw Boom.notFound(`User with identifier '${userId}' not found`);
  }

  await deleteUserRecord(userId);
}
