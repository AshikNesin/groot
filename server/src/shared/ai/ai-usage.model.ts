import { prisma } from "@/core/database";
import type { AIUsage, Prisma } from "@/generated/prisma";

export interface CreateUsageData {
  userId?: number | null;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  stopReason: string;
  requestId: string;
}

export interface UsageQueryParams {
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  provider?: string;
  model?: string;
  limit?: number;
  offset?: number;
}

class AIUsageModel {
  async create(data: CreateUsageData): Promise<AIUsage> {
    return prisma.aIUsage.create({
      data: {
        userId: data.userId,
        provider: data.provider,
        model: data.model,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        totalCost: data.totalCost,
        stopReason: data.stopReason,
        requestId: data.requestId,
      },
    });
  }

  async findByUser(params: UsageQueryParams): Promise<AIUsage[]> {
    const where: Prisma.AIUsageWhereInput = {};

    if (params.userId !== undefined) {
      where.userId = params.userId;
    }
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }
    if (params.provider) {
      where.provider = params.provider;
    }
    if (params.model) {
      where.model = params.model;
    }

    return prisma.aIUsage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
    });
  }

  async getAggregatedStats(userId: number | undefined, startDate: Date, endDate: Date) {
    const where: Prisma.AIUsageWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (userId !== undefined) {
      where.userId = userId;
    }

    return prisma.aIUsage.groupBy({
      by: ["provider", "model"],
      where,
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalCost: true,
      },
      _count: true,
    });
  }

  async getTotalStats(userId: number | undefined, startDate: Date, endDate: Date) {
    const where: Prisma.AIUsageWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (userId !== undefined) {
      where.userId = userId;
    }

    return prisma.aIUsage.aggregate({
      where,
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalCost: true,
      },
      _count: true,
    });
  }
}

export const aiUsageModel = new AIUsageModel();
