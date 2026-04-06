import type { Job, SendOptions } from "pg-boss";
import dayjs from "dayjs";
import { prisma } from "@/core/database";
import { createJobLogger } from "@/core/logger";
import { registerJobHandler } from "@/core/job/worker";

// Job names
export const TODO_JOB_NAMES = {
  CLEANUP: "todo-cleanup",
  SUMMARY: "todo-summary",
} as const;

// Job data types
export type TodoCleanupJobData = {
  daysToKeep?: number;
};

export type TodoSummaryJobData = {
  includeCompleted?: boolean;
};

// Per-job retry/scheduling options
export const todoJobOptions: Record<string, Partial<SendOptions>> = {
  [TODO_JOB_NAMES.CLEANUP]: {
    retryLimit: 2,
    retryDelay: 120,
    retryBackoff: true,
    expireInSeconds: 60 * 60 * 12,
  },
  [TODO_JOB_NAMES.SUMMARY]: {
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    expireInSeconds: 60 * 60 * 12,
  },
};

// --- Handlers ---

const DEFAULT_DAYS_TO_KEEP = 30;

const todoCleanupHandler = async (job: Job<TodoCleanupJobData>): Promise<void> => {
  const logger = createJobLogger({ jobId: job.id, jobName: TODO_JOB_NAMES.CLEANUP });
  const daysToKeep = job.data?.daysToKeep ?? DEFAULT_DAYS_TO_KEEP;
  const cutoff = dayjs().subtract(daysToKeep, "day").toDate();

  const result = await prisma.todo.deleteMany({
    where: {
      completed: true,
      updatedAt: { lt: cutoff },
    },
  });

  logger.info({ jobId: job.id, deleted: result.count, daysToKeep }, "Todo cleanup completed");
};

const todoSummaryHandler = async (job: Job<TodoSummaryJobData>): Promise<void> => {
  const logger = createJobLogger({ jobId: job.id, jobName: TODO_JOB_NAMES.SUMMARY });

  const [total, completed, pending] = await Promise.all([
    prisma.todo.count(),
    prisma.todo.count({ where: { completed: true } }),
    prisma.todo.count({ where: { completed: false } }),
  ]);

  logger.info(
    {
      jobId: job.id,
      includeCompleted: job.data?.includeCompleted ?? true,
      totals: { total, completed, pending },
    },
    "Todo summary generated",
  );
};

// --- Registration ---

export function registerTodoJobs(): void {
  registerJobHandler(TODO_JOB_NAMES.CLEANUP, todoCleanupHandler);
  registerJobHandler(TODO_JOB_NAMES.SUMMARY, todoSummaryHandler);
}
