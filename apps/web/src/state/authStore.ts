"use client";

import { create } from "zustand";
import { loginRequest, setAuthToken, type AuthUser } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  restore: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,

  login: async (email, password) => {
    const resp = await loginRequest(email, password);
    setAuthToken(resp.access_token);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("orbital_user", JSON.stringify(resp.user));
    }
    set({ user: resp.user });
  },

  logout: () => {
    setAuthToken(null);
    if (typeof window !== "undefined") window.localStorage.removeItem("orbital_user");
    set({ user: null });
  },

  restore: () => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("orbital_token");
    const raw = window.localStorage.getItem("orbital_user");
    if (token && raw) {
      setAuthToken(token);
      set({ user: JSON.parse(raw) });
    }
  },
}));
