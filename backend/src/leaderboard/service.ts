import { db } from '../db/client.js';
import { users, gameSessions } from '../db/schema.js';
import { eq, desc, asc, and, gte } from 'drizzle-orm';
import { leaderboardCache } from './cache.js';

export interface LeaderboardEntry {
  id: string; // user id
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  score: number;
  rank: number;
}

export type Timeframe = 'global' | 'monthly' | 'weekly' | 'daily';
export type Mode = 'timer' | 'clicks';

export async function getLeaderboard(mode: Mode, value: number, timeframe: Timeframe): Promise<LeaderboardEntry[]> {
  const cacheKey = `leaderboard:${mode}:${value}:${timeframe}`;
  const cached = leaderboardCache.get<LeaderboardEntry[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Calculate the starting date based on timeframe
  let startDate: Date | null = null;
  const now = new Date();
  if (timeframe === 'daily') {
    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (timeframe === 'weekly') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeframe === 'monthly') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Define the where clause
  let conditions = [
    eq(gameSessions.status, 'completed'),
    eq(gameSessions.modeType, mode),
    eq(gameSessions.modeValue, value),
  ];
  
  if (startDate) {
    conditions.push(gte(gameSessions.serverEndedAt, startDate));
  }

  // Order by score: desc for timer, asc for clicks
  const scoreOrder = mode === 'timer' ? desc(gameSessions.score) : asc(gameSessions.score);

  // Drizzle doesn't have native `DISTINCT ON` support easily accessible without dropping into raw SQL, 
  // but for our MVP, we can pull the top N sessions and deduplicate in memory, 
  // OR we can write a raw query. Since we want top 100 *users*, a raw query is safest.
  
  const rawQuery = db.execute(
    mode === 'timer'
      ? `
        SELECT u.id, u.username, u.display_name as "displayName", u.avatar_url as "avatarUrl", MAX(s.score) as score
        FROM game_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'completed' AND s.mode_type = 'timer' AND s.mode_value = ${value}
        ${startDate ? `AND s.server_ended_at >= '${startDate.toISOString()}'` : ''}
        GROUP BY u.id, u.username, u.display_name, u.avatar_url
        ORDER BY score DESC
        LIMIT 100;
      `
      : `
        SELECT u.id, u.username, u.display_name as "displayName", u.avatar_url as "avatarUrl", MIN(s.score) as score
        FROM game_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'completed' AND s.mode_type = 'clicks' AND s.mode_value = ${value}
        ${startDate ? `AND s.server_ended_at >= '${startDate.toISOString()}'` : ''}
        GROUP BY u.id, u.username, u.display_name, u.avatar_url
        ORDER BY score ASC
        LIMIT 100;
      `
  );

  const result = await rawQuery;

  const entries: LeaderboardEntry[] = (result.rows as any[]).map((row, index) => ({
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    score: Number(row.score),
    rank: index + 1,
  }));

  // Cache for 30 seconds
  leaderboardCache.set(cacheKey, entries, 30);

  return entries;
}
