import type { Job } from "pg-boss";
import { createJobLogger } from "@/core/logger";
import { prisma } from "@/core/database";
import { registerJobHandler } from "@/core/job/worker";
import { JobName, type TodoCleanupJobData } from "@/core/job/queue";

const DEFAULT_DAYS_TO_KEEP = 30;

const todoCleanupJob = async (job: Job<TodoCleanupJobData>): Promise<void> => {
  const logger = createJobLogger(job.id, JobName.TODO_CLEANUP);
  const daysToKeep = job.data?.daysToKeep ?? DEFAULT_DAYS_TO_KEEP;
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

  const result = await prisma.todo.deleteMany({
    where: {
      completed: true,
      updatedAt: {
        lt: cutoff,
      },
    },
  });

  logger.info(
    {
      jobId: job.id,
      deleted: result.count,
      daysToKeep,
    },
    "Todo cleanup completed",
  );
};

registerJobHandler(JobName.TODO_CLEANUP, todoCleanupJob);
