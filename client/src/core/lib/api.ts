import axios, { type AxiosError, type AxiosInstance } from "axios";
import type { Job, JobLog, JobName, JobStats, ScheduledJob } from "@/core/types/jobs";

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * API Client class for making authenticated requests
 */
class ApiClient {
  private client: AxiosInstance;
  private isLoggedIn = false;
  private cachedUserEmail: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: "/api/v1",
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true, // Important for cookies
    });

    // Response interceptor - handle errors and 401s
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse<unknown>>) => {
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
          this.isLoggedIn = false;
          this.cachedUserEmail = null;
          const currentPath = window.location.pathname;
          const reqUrl = error.config?.url || "";
          const isAuthCheck = reqUrl.includes("/auth/me");
          const isLoginCall = reqUrl.includes("/auth/login");

          // Redirect to login if not already there and not checking auth
          if (currentPath !== "/login" && !isAuthCheck && !isLoginCall) {
            window.location.assign("/login");
          }
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isLoggedIn;
  }

  /**
   * Get cached username
   */
  getUsername(): string | null {
    return this.cachedUserEmail;
  }

  /**
   * Generic GET request
   */
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    if (!response.data.data) {
      throw new Error(response.data.error?.message || "No data returned");
    }
    return response.data.data;
  }

  /**
   * Generic POST request
   */
  async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    if (!response.data.data) {
      throw new Error(response.data.error?.message || "No data returned");
    }
    return response.data.data;
  }

  /**
   * Generic PUT request
   */
  async put<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    if (!response.data.data) {
      throw new Error(response.data.error?.message || "No data returned");
    }
    return response.data.data;
  }

  /**
   * Generic PATCH request
   */
  async patch<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    if (!response.data.data) {
      throw new Error(response.data.error?.message || "No data returned");
    }
    return response.data.data;
  }

  /**
   * Generic DELETE request
   */
  async delete(url: string): Promise<void> {
    await this.client.delete(url);
  }

  /**
   * Login with email and password
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; user: { id: number; email: string } }> {
    const response = await this.client.post<
      ApiResponse<{ token: string; user: { id: number; email: string } }>
    >("/auth/login", {
      email,
      password,
    });

    if (!response.data.data) {
      throw new Error(response.data.error?.message || "Login failed");
    }

    // Server sets HttpOnly cookie; keep lightweight cache for UI
    this.isLoggedIn = true;
    this.cachedUserEmail = response.data.data.user.email;

    return response.data.data;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await this.client.post("/auth/logout");
    } finally {
      this.isLoggedIn = false;
      this.cachedUserEmail = null;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<{ id: number; email: string } | null> {
    try {
      const response =
        await this.client.get<ApiResponse<{ id: number; email: string }>>("/auth/me");

      if (!response.data.data) return null;

      this.isLoggedIn = true;
      this.cachedUserEmail = response.data.data.email;

      return response.data.data;
    } catch {
      this.isLoggedIn = false;
      this.cachedUserEmail = null;
      return null;
    }
  }

  // Jobs API
  async getJobStats(): Promise<JobStats> {
    const response = await this.client.get<ApiResponse<JobStats>>("/jobs/stats");
    if (!response.data.data) {
      throw new Error("Failed to fetch job stats");
    }
    return response.data.data;
  }

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

    const response = await this.client.get<ApiResponse<{ jobs: Job[]; total: number }>>(
      `/jobs?${params.toString()}`,
    );
    return {
      jobs: response.data.data?.jobs ?? [],
      total: response.data.metadata?.total ?? response.data.data?.total ?? 0,
    };
  }

  async getJob(queueName: string, jobId: string): Promise<Job> {
    const response = await this.client.get<ApiResponse<Job>>(`/jobs/${queueName}/${jobId}`);
    if (!response.data.data) {
      throw new Error("Job not found");
    }
    return response.data.data;
  }

  async getJobLogs(queueName: string, jobId: string, afterId?: number): Promise<JobLog[]> {
    const params = new URLSearchParams();
    if (afterId) params.append("afterId", afterId.toString());

    const response = await this.client.get<ApiResponse<JobLog[]>>(
      `/jobs/${queueName}/${jobId}/logs?${params.toString()}`,
    );
    return response.data.data ?? [];
  }

  async retryJob(queueName: string, jobId: string): Promise<void> {
    await this.client.post(`/jobs/${queueName}/${jobId}/retry`);
  }

  async cancelJob(queueName: string, jobId: string): Promise<void> {
    await this.client.post(`/jobs/${queueName}/${jobId}/cancel`);
  }

  async resumeJob(queueName: string, jobId: string): Promise<void> {
    await this.client.post(`/jobs/${queueName}/${jobId}/resume`);
  }

  async deleteJob(queueName: string, jobId: string): Promise<void> {
    await this.client.delete(`/jobs/${queueName}/${jobId}`);
  }

  async rerunJob(
    queueName: string,
    jobId: string,
  ): Promise<{ originalJobId: string; newJobId: string; queueName: string }> {
    const response = await this.client.post<
      ApiResponse<{
        originalJobId: string;
        newJobId: string;
        queueName: string;
      }>
    >(`/jobs/${queueName}/${jobId}/rerun`);
    if (!response.data.data) {
      throw new Error("Failed to re-run job");
    }
    return response.data.data;
  }

  async rerunJobs(jobs: { queueName: string; jobId: string }[]): Promise<
    Array<{
      queueName: string;
      jobId: string;
      success: boolean;
      newJobId?: string | null;
      error?: string;
    }>
  > {
    const response = await this.client.post<
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
    if (!response.data.data) {
      throw new Error("Failed to re-run jobs");
    }
    return response.data.data;
  }

  async purgeJobsByState(state: string): Promise<{ deletedCount: number }> {
    const response = await this.client.delete<ApiResponse<{ deletedCount: number; state: string }>>(
      `/jobs/state/${state}`,
    );
    if (!response.data.data) {
      throw new Error("Failed to purge jobs");
    }
    return { deletedCount: response.data.data.deletedCount };
  }

  async addJob(
    jobName: JobName,
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<string> {
    const response = await this.client.post<ApiResponse<{ jobId: string }>>("/jobs", {
      jobName,
      data,
      options,
    });
    if (!response.data.data) {
      throw new Error("Failed to add job");
    }
    return response.data.data.jobId;
  }

  async getAvailableJobs(): Promise<string[]> {
    const response = await this.client.get<ApiResponse<{ jobs: string[] }>>("/jobs/available");
    return response.data.data?.jobs ?? [];
  }

  async getScheduledJobs(): Promise<ScheduledJob[]> {
    const response = await this.client.get<ApiResponse<ScheduledJob[]>>("/jobs/schedule");
    return response.data.data ?? [];
  }

  async scheduleJob(
    jobName: JobName,
    cron: string,
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<void> {
    await this.client.post("/jobs/schedule", { jobName, data, cron, options });
  }

  async cancelScheduledJob(jobName: string): Promise<void> {
    await this.client.delete(`/jobs/schedule/${jobName}`);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Also export the raw axios instance for backward compatibility
export const api = apiClient.client;
