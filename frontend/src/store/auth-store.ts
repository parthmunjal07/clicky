import { create } from 'zustand';
import type { User } from '../lib/auth-api';
import { configureAuth } from '../lib/api';
import { authApi } from '../lib/auth-api';
import { showToast } from './toast-store';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  hydrate: () => Promise<void>;
}

const STORAGE_KEYS = {
  accessToken: 'clicky_access_token',
  refreshToken: 'clicky_refresh_token',
} as const;

export const useAuthStore = create<AuthState>((set, get) => {
  // Wire up the API client with the store's token accessors
  configureAuth({
    getAccessToken: () => get().accessToken,
    getRefreshToken: () => get().refreshToken,
    onTokenRefresh: (accessToken, refreshToken) => {
      get().updateTokens(accessToken, refreshToken);
    },
    onAuthFailure: () => {
      get().clearAuth();
      showToast('Session expired, please log in again');
    },
  });

  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
    isHydrated: false,

    setAuth: (user, accessToken, refreshToken) => {
      localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
      localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    },

    updateTokens: (accessToken, refreshToken) => {
      localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
      localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
      set({ accessToken, refreshToken });
    },

    clearAuth: () => {
      localStorage.removeItem(STORAGE_KEYS.accessToken);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    },

    setLoading: (loading) => set({ isLoading: loading }),

    hydrate: async () => {
      const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
      const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);

      if (!accessToken || !refreshToken) {
        set({ isLoading: false, isHydrated: true });
        return;
      }

      // Temporarily set tokens so API calls can use them
      set({ accessToken, refreshToken });

      try {
        const { user } = await authApi.getProfile();
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isHydrated: true,
        });
      } catch {
        // Tokens invalid — clear everything
        localStorage.removeItem(STORAGE_KEYS.accessToken);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          isHydrated: true,
        });
      }
    },
  };
});
