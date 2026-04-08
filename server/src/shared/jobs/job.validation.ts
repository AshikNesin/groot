import { z } from "zod";

export const createJobSchema = z.object({
  jobName: z.string().min(1),
  data: z.any().optional(),
  options: z.any().optional(),
});

export const scheduleJobSchema = z.object({
  jobName: z.string().min(1),
  cron: z.string().min(1),
  data: z.any().optional(),
  options: z.any().optional(),
});

export const bulkRerunSchema = z.object({
  jobs: z.array(
    z.object({
      queueName: z.string().min(1),
      jobId: z.string().min(1),
    }),
  ),
});

export const getJobsByStateSchema = z.object({
  state: z.string().min(1),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
});

export const getJobsSchema = z.object({
  state: z.string().optional(),
  name: z.string().optional(),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const fetchAvailableJobsSchema = z.object({
  queue: z.string().min(1, "Queue name is required"),
  limit: z.coerce.number().optional(),
});
