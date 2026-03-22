import { prisma } from "@/core/database";
import type { User } from "@/generated/prisma/models";

class UserModel {
  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }
}

export const userModel = new UserModel();
