import { api } from './api';

export interface LeaderboardEntry {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  score: number;
  rank: number;
}

export type Timeframe = 'global' | 'monthly' | 'weekly' | 'daily';
export type Mode = 'timer' | 'clicks';

export const leaderboardApi = {
  getLeaderboard: (mode: Mode, value: number, timeframe: Timeframe) =>
    api.get<{ leaderboard: LeaderboardEntry[] }>(`/leaderboard/${timeframe}?mode=${mode}&value=${value}`),
};
