import { api } from './api';
import type { User } from './auth-api';

export interface UserStats {
  totalClicks: number;
  highestCps: number;
  totalGamesPlayed: number;
}

export interface SessionHistoryItem {
  id: string;
  date: string;
  mode: 'Timer' | 'Clicks';
  score: number | string;
  rank: number | string;
}

export interface UserProfile extends User {
  displayName: string | null;
  avatarUrl: string | null;
  settings: string | null;
  stats: UserStats;
  recentSessions: SessionHistoryItem[];
}

export interface UpdateProfilePayload {
  displayName?: string;
  avatarUrl?: string;
  settings?: string;
}

const USERS_BASE = '/users';

export const usersApi = {
  getProfile: () => api.get<{ user: UserProfile }>(`${USERS_BASE}/me`),

  updateProfile: (data: UpdateProfilePayload) =>
    api.patch<{ message: string; user: UserProfile }>(`${USERS_BASE}/me`, data),

  deleteAccount: () =>
    api.delete<{ message: string }>(`${USERS_BASE}/me`),
};
