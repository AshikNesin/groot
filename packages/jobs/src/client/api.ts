import { apiClient } from "@groot/shell/lib/api";
import type { Job, JobLog, JobName, JobStats, ScheduledJob } from "./types";

/**
 * Jobs API client. Thin typed wrappers over the shared `apiClient` — the
 * envelope unwrapping and 401 handling live in one place (@groot/shell/lib/api).
 */
export const jobsApi = {
  async getJobStats(): Promise<JobStats> {
    return apiClient.get<JobStats>("/jobs/stats");
  },

  async getJobs(options?: {
    state?: string;
    name?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{ jobs: Job[]; total: number }> {
    return apiClient.get<{ jobs: Job[]; total: number }>("/jobs", options);
  },

  async getJob(queueName: string, jobId: string): Promise<Job> {
    return apiClient.get<Job>(`/jobs/${queueName}/${jobId}`);
  },

  async getJobLogs(queueName: string, jobId: string, afterId?: number): Promise<JobLog[]> {
    return apiClient.get<JobLog[]>(
      `/jobs/${queueName}/${jobId}/logs`,
      afterId ? { afterId } : undefined,
    );
  },

  async retryJob(queueName: string, jobId: string): Promise<void> {
    await apiClient.post(`/jobs/${queueName}/${jobId}/retry`);
  },

  async cancelJob(queueName: string, jobId: string): Promise<void> {
    await apiClient.post(`/jobs/${queueName}/${jobId}/cancel`);
  },

  async resumeJob(queueName: string, jobId: string): Promise<void> {
    await apiClient.post(`/jobs/${queueName}/${jobId}/resume`);
  },

  async deleteJob(queueName: string, jobId: string): Promise<void> {
    await apiClient.delete(`/jobs/${queueName}/${jobId}`);
  },

  async rerunJob(
    queueName: string,
    jobId: string,
  ): Promise<{ newJobId: string; queueName: string }> {
    return apiClient.post<{ newJobId: string; queueName: string }>(
      `/jobs/${queueName}/${jobId}/rerun`,
    );
  },

  async rerunJobs(jobs: { queueName: string; jobId: string }[]): Promise<
    Array<{
      queueName: string;
      jobId: string;
      success: boolean;
      newJobId?: string | null;
      error?: string;
    }>
  > {
    return apiClient.post<
      Array<{
        queueName: string;
        jobId: string;
        success: boolean;
        newJobId?: string | null;
        error?: string;
      }>
    >("/jobs/bulk-rerun", { jobs });
  },

  async purgeJobsByState(state: string): Promise<{ deletedCount: number }> {
    const result = await apiClient.delete<{ count: number }>(`/jobs/state/${state}`);
    return { deletedCount: result.count };
  },

  async addJob(
    jobName: JobName,
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<string> {
    const result = await apiClient.post<{ jobId: string }>("/jobs", { jobName, data, options });
    return result.jobId;
  },

  async getAvailableJobs(): Promise<string[]> {
    const result = await apiClient.get<{ jobs: string[] }>("/jobs/available");
    return result.jobs;
  },

  async getScheduledJobs(): Promise<ScheduledJob[]> {
    return apiClient.get<ScheduledJob[]>("/jobs/schedule");
  },

  async scheduleJob(
    jobName: JobName,
    cron: string,
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<void> {
    await apiClient.post("/jobs/schedule", { jobName, data, cron, options });
  },

  async cancelScheduledJob(jobName: string, key?: string): Promise<void> {
    await apiClient.delete(`/jobs/schedule/${jobName}`, { key });
  },

  async editScheduledJob(
    jobName: string,
    key: string | undefined,
    cron: string,
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<void> {
    await apiClient.put(`/jobs/schedule/${jobName}`, { key, cron, data, options });
  },
};
