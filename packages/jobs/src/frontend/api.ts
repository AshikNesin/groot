import { api, type ApiResponse } from "@groot/client/lib/api";
import type { Job, JobLog, JobName, JobStats, ScheduledJob } from "./types";

/**
 * Jobs API client. Reuses the shared axios instance (`api`) + 401 interceptor
 * from @groot/client/lib/api — no duplicated axios setup.
 */
export const jobsApi = {
  async getJobStats(): Promise<JobStats> {
    const response = await api.get<ApiResponse<JobStats>>("/jobs/stats");
    if (response.data.data === undefined || response.data.data === null) {
      throw new Error("Failed to fetch job stats");
    }
    return response.data.data;
  },

  async getJobs(options?: {
    state?: string;
    name?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{ jobs: Job[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.state) params.append("state", options.state);
    if (options?.name) params.append("name", options.name);
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.startDate) params.append("startDate", options.startDate);
    if (options?.endDate) params.append("endDate", options.endDate);

    const response = await api.get<ApiResponse<{ jobs: Job[]; total: number }>>(
      `/jobs?${params.toString()}`,
    );
    return {
      jobs: response.data.data?.jobs ?? [],
      total: response.data.metadata?.total ?? response.data.data?.total ?? 0,
    };
  },

  async getJob(queueName: string, jobId: string): Promise<Job> {
    const response = await api.get<ApiResponse<Job>>(`/jobs/${queueName}/${jobId}`);
    if (response.data.data === undefined || response.data.data === null) {
      throw new Error("Job not found");
    }
    return response.data.data;
  },

  async getJobLogs(queueName: string, jobId: string, afterId?: number): Promise<JobLog[]> {
    const params = new URLSearchParams();
    if (afterId) params.append("afterId", afterId.toString());

    const response = await api.get<ApiResponse<JobLog[]>>(
      `/jobs/${queueName}/${jobId}/logs?${params.toString()}`,
    );
    return response.data.data ?? [];
  },

  async retryJob(queueName: string, jobId: string): Promise<void> {
    await api.post(`/jobs/${queueName}/${jobId}/retry`);
  },

  async cancelJob(queueName: string, jobId: string): Promise<void> {
    await api.post(`/jobs/${queueName}/${jobId}/cancel`);
  },

  async resumeJob(queueName: string, jobId: string): Promise<void> {
    await api.post(`/jobs/${queueName}/${jobId}/resume`);
  },

  async deleteJob(queueName: string, jobId: string): Promise<void> {
    await api.delete(`/jobs/${queueName}/${jobId}`);
  },

  async rerunJob(
    queueName: string,
    jobId: string,
  ): Promise<{ originalJobId: string; newJobId: string; queueName: string }> {
    const response = await api.post<
      ApiResponse<{
        originalJobId: string;
        newJobId: string;
        queueName: string;
      }>
    >(`/jobs/${queueName}/${jobId}/rerun`);
    if (response.data.data === undefined || response.data.data === null) {
      throw new Error("Failed to re-run job");
    }
    return response.data.data;
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
    const response = await api.post<
      ApiResponse<
        Array<{
          queueName: string;
          jobId: string;
          success: boolean;
          newJobId?: string | null;
          error?: string;
        }>
      >
    >("/jobs/bulk-rerun", { jobs });
    if (response.data.data === undefined || response.data.data === null) {
      throw new Error("Failed to re-run jobs");
    }
    return response.data.data;
  },

  async purgeJobsByState(state: string): Promise<{ deletedCount: number }> {
    const response = await api.delete<ApiResponse<{ deletedCount: number; state: string }>>(
      `/jobs/state/${state}`,
    );
    if (response.data.data === undefined || response.data.data === null) {
      throw new Error("Failed to purge jobs");
    }
    return { deletedCount: response.data.data.deletedCount };
  },

  async addJob(
    jobName: JobName,
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<string> {
    const response = await api.post<ApiResponse<{ jobId: string }>>("/jobs", {
      jobName,
      data,
      options,
    });
    if (response.data.data === undefined || response.data.data === null) {
      throw new Error("Failed to add job");
    }
    return response.data.data.jobId;
  },

  async getAvailableJobs(): Promise<string[]> {
    const response = await api.get<ApiResponse<{ jobs: string[] }>>("/jobs/available");
    return response.data.data?.jobs ?? [];
  },

  async getScheduledJobs(): Promise<ScheduledJob[]> {
    const response = await api.get<ApiResponse<ScheduledJob[]>>("/jobs/schedule");
    return response.data.data ?? [];
  },

  async scheduleJob(
    jobName: JobName,
    cron: string,
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<void> {
    await api.post("/jobs/schedule", { jobName, data, cron, options });
  },

  async cancelScheduledJob(jobName: string, key?: string): Promise<void> {
    await api.delete(`/jobs/schedule/${jobName}`, { data: { key } });
  },

  async editScheduledJob(
    jobName: string,
    key: string | undefined,
    cron: string,
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<void> {
    await api.put(`/jobs/schedule/${jobName}`, { key, cron, data, options });
  },
} as const;
