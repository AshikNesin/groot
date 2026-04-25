import { prisma } from "@/core/database";
import type { AIConversation, Prisma } from "@/generated/prisma";

export interface CreateConversationData {
  userId?: number | null;
  title?: string;
  context: Prisma.JsonObject;
  lastModel: string;
}

export interface UpdateConversationData {
  title?: string;
  context?: Prisma.JsonObject;
  lastModel?: string;
  messageCount?: number;
}

class AIConversationModel {
  async create(data: CreateConversationData): Promise<AIConversation> {
    return prisma.aIConversation.create({
      data: {
        userId: data.userId,
        title: data.title,
        context: data.context,
        lastModel: data.lastModel,
        messageCount: 1,
      },
    });
  }

  async findById(id: number, userId?: number): Promise<AIConversation | null> {
    const where: Prisma.AIConversationWhereInput = { id };
    if (userId !== undefined) {
      where.userId = userId;
    }
    return prisma.aIConversation.findFirst({ where });
  }

  async findByUser(userId: number | undefined, limit = 20, offset = 0): Promise<AIConversation[]> {
    const where: Prisma.AIConversationWhereInput = {};
    if (userId !== undefined) {
      where.userId = userId;
    }

    return prisma.aIConversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async update(id: number, data: UpdateConversationData): Promise<AIConversation> {
    return prisma.aIConversation.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<AIConversation> {
    return prisma.aIConversation.delete({
      where: { id },
    });
  }
}

export const aiConversationModel = new AIConversationModel();
