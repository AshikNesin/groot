import { prisma } from "@/core/database";
import type { User } from "@/generated/prisma";

interface CreateUserData {
  email: string;
  password: string;
  name?: string;
}

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

  async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
    });
  }

  async delete(id: number): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }

  async findAll(): Promise<Pick<User, "id" | "email" | "name" | "createdAt">[]> {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
  }
}

export const userModel = new UserModel();
