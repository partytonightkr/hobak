import { create } from "zustand";
import api from "@/lib/api";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  refreshAccessToken,
} from "@/lib/auth";

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  website: string | null;
  location: string | null;
  isVerified: boolean;
  isPremium: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; username: string; displayName: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

// Lightweight session cookie for Next.js middleware route protection.
// This cookie carries NO auth data; it's just a hint so the edge
// middleware can redirect unauthenticated users before hydration.
function setSessionCookie() {
  if (typeof document !== "undefined") {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `has_session=true; path=/; max-age=604800; SameSite=Lax${secure}`;
  }
}

function clearSessionCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "has_session=; path=/; max-age=0";
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    // Access token lives only in JS memory -- never in localStorage
    setAccessToken(data.accessToken);
    // Refresh token is stored in HTTP-only cookie by the server
    setSessionCookie();
    set({ user: data.user, isAuthenticated: true, isLoading: false });
  },

  register: async (registerData) => {
    const { data } = await api.post("/auth/register", registerData);
    setAccessToken(data.accessToken);
    setSessionCookie();
    set({ user: data.user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearAccessToken();
      clearSessionCookie();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  fetchUser: async () => {
    if (!getAccessToken()) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        clearSessionCookie();
        set({ isLoading: false });
        return;
      }
    }
    try {
      const { data } = await api.get("/auth/me");
      setSessionCookie();
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch {
      clearAccessToken();
      clearSessionCookie();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (data) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...data } });
    }
  },
}));
