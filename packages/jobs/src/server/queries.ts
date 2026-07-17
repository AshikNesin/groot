import dayjs from "dayjs";
import { prisma } from "@groot/core/database";
import { VALID_JOB_STATES, isValidJobState } from "./constants";
import { getJobQueue } from "./client";
import { Boom } from "@groot/core/errors";
import type {
  ScheduledJobInfo,
  FetchJobsOptions,
  GetFailedJobsOptions,
  GetJobsByStateOptions,
  GetJobsOptions,
  JobQueryResponse,
} from "./types";
import type { QueueJob } from "./adapter";

// Get all scheduled jobs
export const getScheduledJobs = async (): Promise<ScheduledJobInfo[]> => {
  const queue = getJobQueue();
  return queue.getSchedules();
};

// Get job by ID
export const getJobById = async (options: {
  queueName: string;
  jobId: string;
}): Promise<QueueJob | null> => {
  const queue = getJobQueue();
  return queue.getJobById(options.queueName, options.jobId);
};

// Get queue statistics (state-level counts)
export const getQueueStats = async (): Promise<Record<string, number>> => {
  const queue = getJobQueue();
  return queue.getQueueStats();
};

// Get available queue names
export const getAvailableQueues = async (): Promise<string[]> => {
  const queue = getJobQueue();
  return queue.getAvailableQueues();
};

// Fetch jobs with filters (queue-based, for fetching from a specific queue)
export const fetchJobs = async (options: FetchJobsOptions): Promise<QueueJob[]> => {
  const queue = getJobQueue();
  return queue.fetchJobs(options.queueName, options.limit ?? 50);
};

// Get failed jobs (state-based query)
export const getFailedJobs = async (options?: GetFailedJobsOptions): Promise<QueueJob[]> => {
  const limit = options?.limit ?? 50;
  const queue = getJobQueue();
  return queue.getFailedJobs(limit);
};

// Get jobs by state (state-based query with pagination)
export const getJobsByState = async (options: GetJobsByStateOptions): Promise<JobQueryResponse> => {
  const { state, limit = 50, offset = 0 } = options;
  if (!isValidJobState(state)) {
    throw Boom.badRequest(
      `Invalid job state: ${state}. Valid states: ${VALID_JOB_STATES.join(", ")}`,
    );
  }
  const queue = getJobQueue();
  return queue.getJobsByState(state, limit, offset);
};

// Get jobs with filters (supports state, name, date range, pagination)
export const getJobs = async (options: GetJobsOptions): Promise<JobQueryResponse> => {
  const { state, startDate, endDate, limit = 50, offset = 0 } = options;
  if (state && !isValidJobState(state)) {
    throw Boom.badRequest(
      `Invalid job state: ${state}. Valid states: ${VALID_JOB_STATES.join(", ")}`,
    );
  }
  if (startDate && !dayjs(startDate).isValid()) {
    throw Boom.badRequest(`Invalid startDate: ${startDate}. Must be a valid date string.`);
  }
  if (endDate && !dayjs(endDate).isValid()) {
    throw Boom.badRequest(`Invalid endDate: ${endDate}. Must be a valid date string.`);
  }
  const queue = getJobQueue();
  return queue.getJobs({ ...options, limit, offset });
};

// Purge jobs by state
export const purgeJobsByState = async (options: { state: string }): Promise<number> => {
  const { state } = options;
  if (!isValidJobState(state)) {
    throw Boom.badRequest(
      `Invalid job state: ${state}. Valid states: ${VALID_JOB_STATES.join(", ")}`,
    );
  }
  const queue = getJobQueue();
  return queue.purgeJobsByState(state);
};

// prisma import kept for getLogs (controller writes JobLog rows via prisma).
export { prisma };
