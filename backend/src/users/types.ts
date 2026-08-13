import type { User } from '../db/schema.js';

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

export interface UserProfile extends Omit<User, 'passwordHash' | 'failedLoginAttempts' | 'lockedUntil'> {
  stats: UserStats;
  recentSessions: SessionHistoryItem[];
}
