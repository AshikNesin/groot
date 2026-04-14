import { create } from "zustand";
import { apiClient } from "@/core/lib/api";

interface AuthState {
  isAuthenticated: boolean;
  user: { id: number; email: string } | null;
  isLoading: boolean;
  error: string | null;
  hasCheckedAuth: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  hasCheckedAuth: false,

  /**
   * Login with email and password (JWT)
   */
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await apiClient.login(email, password);
      set({ isAuthenticated: true, user, isLoading: false });
    } catch (error) {
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "Login failed",
      });
      throw error;
    }
  },

  /**
   * Logout
   */
  logout: async () => {
    try {
      await apiClient.logout();
    } finally {
      set({ isAuthenticated: false, user: null, error: null });
    }
  },

  /**
   * Check authentication status on app load
   */
  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const user = await apiClient.getCurrentUser();
      set({
        isAuthenticated: !!user,
        user,
        isLoading: false,
        hasCheckedAuth: true,
      });
    } catch {
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        hasCheckedAuth: true,
      });
    }
  },
}));
