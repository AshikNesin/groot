import axios, { type AxiosError, type AxiosInstance } from "axios";
import { useAuthStore } from "../store/auth";

/**
 * Standard API response envelope (mirrors the server's `api-response.utils`).
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
 * API Client — the single surface for backend calls. Unwraps the
 * `{ success, data }` envelope and throws on missing data so callers get
 * typed values directly. Auth state lives in the Zustand store (`useAuthStore`),
 * not in this client.
 *
 * Note: this module imports `useAuthStore` for the 401 handler, and the store
 * imports `apiClient` for its actions. That cycle is safe — neither references
 * the other at module load, only inside functions called later.
 */
class ApiClient {
  public client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "/api/v1",
      withCredentials: true, // send the auth cookie
      // No pinned Content-Type: axios auto-sets application/json for object
      // bodies and lets the browser set multipart/form-data (with boundary)
      // for FormData — see `postForm`.
    });

    // Response interceptor - on a real 401 (session expired mid-session),
    // clear auth so <ProtectedRoute> does an SPA navigate to /login instead
    // of a full page reload. The initial auth probe (/auth/me) and login
    // calls are handled by their callers, so they're skipped here.
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse<unknown>>) => {
        if (error.response?.status === 401) {
          const reqUrl = error.config?.url ?? "";
          const isAuthEndpoint = reqUrl.includes("/auth/me") || reqUrl.includes("/auth/login");
          const onLoginPage = window.location.pathname === "/login";
          if (!isAuthEndpoint && !onLoginPage) {
            useAuthStore.getState().clearAuth();
          }
        }
        return Promise.reject(error);
      },
    );
  }

  private unwrap<T>(response: { data: ApiResponse<T> }): T {
    if (response.data.data === undefined || response.data.data === null) {
      throw new Error(response.data.error?.message ?? "No data returned");
    }
    return response.data.data;
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return this.unwrap<T>(await this.client.get<ApiResponse<T>>(url, { params }));
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    return this.unwrap<T>(await this.client.post<ApiResponse<T>>(url, data));
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    return this.unwrap<T>(await this.client.put<ApiResponse<T>>(url, data));
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    return this.unwrap<T>(await this.client.patch<ApiResponse<T>>(url, data));
  }

  /**
   * DELETE. Unlike the other verbs, DELETE may legitimately return no body
   * (204 No Content), so this does not throw on missing data — it returns
   * whatever data is present (typed by the caller) or `undefined`.
   */
  async delete<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, data ? { data } : undefined);
    return response.data.data as T;
  }

  /** Upload `FormData` — the browser sets the multipart Content-Type + boundary. */
  async postForm<T>(url: string, formData: FormData): Promise<T> {
    return this.unwrap<T>(await this.client.post<ApiResponse<T>>(url, formData));
  }

  /** Download a binary file as a `Blob` (no envelope unwrapping). */
  async getBlob(url: string, params?: Record<string, unknown>): Promise<Blob> {
    const response = await this.client.get<Blob>(url, { params, responseType: "blob" });
    return response.data;
  }

  /** Login with email and password. Server sets the HttpOnly cookie. */
  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; user: { id: number; email: string } }> {
    return this.unwrap(
      await this.client.post<ApiResponse<{ token: string; user: { id: number; email: string } }>>(
        "/auth/login",
        { email, password },
      ),
    );
  }

  /** Logout — clears the server cookie. */
  async logout(): Promise<void> {
    await this.client.post("/auth/logout");
  }

  /** Get the current authenticated user, or null if not signed in. */
  async getCurrentUser(): Promise<{ id: number; email: string } | null> {
    try {
      const response =
        await this.client.get<ApiResponse<{ id: number; email: string }>>("/auth/me");
      return response.data.data ?? null;
    } catch {
      return null;
    }
  }
}

export const apiClient = new ApiClient();
