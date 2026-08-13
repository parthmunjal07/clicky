import { create } from 'zustand';
import { configureAuth } from '../lib/api';
import { usersApi } from '../lib/users-api';
import type { UserProfile } from '../lib/users-api';
import { showToast } from './toast-store';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;

  setAuth: (user: UserProfile) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Wire up the API client with the store's token accessors
  configureAuth({
    onAuthFailure: () => {
      get().clearAuth();
      showToast('Session expired, please log in again');
    },
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isHydrated: false,

    setAuth: (user) => {
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    },

    clearAuth: () => {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    },

    setLoading: (loading) => set({ isLoading: loading }),

    hydrate: async () => {
      try {
        const { user } = await usersApi.getProfile();
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isHydrated: true,
        });
      } catch {
        // Tokens invalid or not present — clear everything
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isHydrated: true,
        });
      }
    },
  };
});
