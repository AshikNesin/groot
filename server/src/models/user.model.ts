import { prisma } from "@/core/database";
import type { User } from "@/generated/prisma";

/**
 * Find user by ID
 */
export const findById = async (id: number): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { id },
  });
};

/**
 * Find user by email
 */
export const findByEmail = async (email: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { email },
  });
};
