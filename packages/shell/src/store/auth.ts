import { create } from "zustand";
import { apiClient } from "../lib/api";

interface AuthState {
  isAuthenticated: boolean;
  user: { id: number; email: string } | null;
  isLoading: boolean;
  error: string | null;
  hasCheckedAuth: boolean;
  /** Bumped on any auth-state change so stale 401s can be ignored. */
  generation: number;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  hasCheckedAuth: false,
  generation: 0,

  /**
   * Login with email and password (JWT)
   */
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await apiClient.login(email, password);
      set((s) => ({
        isAuthenticated: true,
        user,
        isLoading: false,
        generation: s.generation + 1,
      }));
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
      set((s) => ({
        isAuthenticated: false,
        user: null,
        error: null,
        generation: s.generation + 1,
      }));
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

  /**
   * Clear auth state without a server call. Used by the API 401 interceptor
   * when the session expires mid-session — <ProtectedRoute> reacts and
   * navigates to /login.
   */
  clearAuth: () =>
    set((s) => ({
      isAuthenticated: false,
      user: null,
      error: null,
      generation: s.generation + 1,
    })),
}));
