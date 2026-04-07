import dayjs from "dayjs";
import { aiUsageModel } from "@/shared/ai/ai-usage.model";
import type { UsageQueryDTO } from "@/shared/ai/ai.validation";

export interface UsageStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  byModel: Array<{
    provider: string;
    model: string;
    count: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
}

export async function getUsage({
  userId,
  params,
}: {
  userId?: number;
  params: UsageQueryDTO;
}): Promise<UsageStats> {
  if (userId === undefined) {
    throw new Error("Authentication required for usage statistics");
  }

  const startDate = params.startDate
    ? dayjs(params.startDate).toDate()
    : dayjs().subtract(30, "day").toDate();
  const endDate = params.endDate ? dayjs(params.endDate).toDate() : dayjs().toDate();

  const [totalStats, groupedStats] = await Promise.all([
    aiUsageModel.getTotalStats(userId, startDate, endDate),
    aiUsageModel.getAggregatedStats(userId, startDate, endDate),
  ]);

  return {
    totalRequests: totalStats._count,
    totalInputTokens: totalStats._sum.inputTokens ?? 0,
    totalOutputTokens: totalStats._sum.outputTokens ?? 0,
    totalCost: Number(totalStats._sum.totalCost ?? 0),
    byModel: groupedStats.map((g) => ({
      provider: g.provider,
      model: g.model,
      count: g._count,
      inputTokens: g._sum.inputTokens ?? 0,
      outputTokens: g._sum.outputTokens ?? 0,
      cost: Number(g._sum.totalCost ?? 0),
    })),
  };
}

export async function getUsageRecords({
  userId,
  params,
}: {
  userId?: number;
  params: UsageQueryDTO;
}) {
  if (userId === undefined) {
    throw new Error("Authentication required for usage records");
  }

  return aiUsageModel.findByUser({
    userId,
    startDate: params.startDate ? dayjs(params.startDate).toDate() : undefined,
    endDate: params.endDate ? dayjs(params.endDate).toDate() : undefined,
    provider: params.provider,
    model: params.model,
    limit: params.limit,
    offset: params.offset,
  });
}
