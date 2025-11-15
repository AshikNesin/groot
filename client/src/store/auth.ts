import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  user: { username: string } | null;
  login: (username: string, password: string) => void;
  logout: () => void;
  checkAuth: () => void;
}

const AUTH_KEY = "auth";

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: Boolean(localStorage.getItem(AUTH_KEY)),
  user: null,
  login: (username, password) => {
    const token = btoa(`${username}:${password}`);
    localStorage.setItem(AUTH_KEY, token);
    set({ isAuthenticated: true, user: { username } });
  },
  logout: () => {
    localStorage.removeItem(AUTH_KEY);
    set({ isAuthenticated: false, user: null });
  },
  checkAuth: () => {
    const token = localStorage.getItem(AUTH_KEY);
    set({ isAuthenticated: Boolean(token) });
  },
}));
