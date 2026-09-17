import type { QueueJob } from "./adapter";

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface GetJobsByStateOptions extends PaginationOptions {
  state: string;
}

export interface GetFailedJobsOptions {
  limit?: number;
}

export interface FetchJobsOptions {
  queueName: string;
  limit?: number;
}

export interface GetJobsOptions extends PaginationOptions {
  state?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
}

export interface RerunJobOptions {
  queueName: string;
  jobId: string;
}

export interface JobQueryResponse {
  jobs: QueueJob[];
  total: number;
}

export interface BulkRerunResult {
  queueName: string;
  jobId: string;
  success: boolean;
  newJobId?: string | null;
  error?: string;
}
