import axios, { type AxiosError, type AxiosInstance } from "axios";

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
      const response = await this.client.get<
        ApiResponse<{ id: number; email: string }>
      >("/auth/me");

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
}

// Export singleton instance
export const apiClient = new ApiClient();

// Also export the raw axios instance for backward compatibility
export const api = apiClient["client"];
