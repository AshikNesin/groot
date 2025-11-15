import type { Job } from "pg-boss";
import { prisma } from "@/core/database";
import { logger } from "@/core/logger";
import { registerJobHandler } from "@/core/job/worker";
import { JobName, type TodoSummaryJobData } from "@/core/job/queue";

const todoSummaryJob = async (job: Job<TodoSummaryJobData>): Promise<void> => {
  const [total, completed, pending] = await Promise.all([
    prisma.todo.count(),
    prisma.todo.count({ where: { completed: true } }),
    prisma.todo.count({ where: { completed: false } }),
  ]);

  const payload = {
    jobId: job.id,
    includeCompleted: job.data?.includeCompleted ?? true,
    totals: {
      total,
      completed,
      pending,
    },
  };

  logger.info(payload, "Todo summary generated");
};

registerJobHandler(JobName.TODO_SUMMARY, todoSummaryJob);
