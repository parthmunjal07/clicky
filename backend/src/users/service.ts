import { db } from '../db/client.js';
import { users, gameSessions } from '../db/schema.js';
import { eq, sql, desc, and } from 'drizzle-orm';
import { AppError } from '../auth/service.js';
import type { UserProfile, SessionHistoryItem, UserStats } from './types.js';
import type { UpdateProfilePayload } from './validation.js';

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Aggregate stats
  const [statsResult] = await db
    .select({
      totalGamesPlayed: sql<number>`cast(count(*) as int)`,
      totalClicks: sql<number>`cast(sum(${gameSessions.clickCount}) as int)`,
      highestCps: sql<number>`
        max(
          cast(${gameSessions.clickCount} as float) / (greatest(
            coalesce(${gameSessions.elapsedMs}, 
              case when ${gameSessions.modeType} = 'timer' then ${gameSessions.modeValue} * 1000 else 1 end
            ), 1) / 1000.0)
        )
      `
    })
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.userId, userId),
        eq(gameSessions.status, 'completed')
      )
    );

  const stats: UserStats = {
    totalGamesPlayed: statsResult?.totalGamesPlayed || 0,
    totalClicks: statsResult?.totalClicks || 0,
    highestCps: Number((statsResult?.highestCps || 0).toFixed(2)),
  };

  // Get recent sessions
  const recentSessionsData = await db
    .select({
      id: gameSessions.id,
      serverEndedAt: gameSessions.serverEndedAt,
      modeType: gameSessions.modeType,
      score: gameSessions.score,
      elapsedMs: gameSessions.elapsedMs,
      // We don't have rank stored properly per session in an easy queryable way without a window function. 
      // For now, we'll return a placeholder or calculate a rank if needed, but the prompt didn't explicitly ask for rank calculation.
      // We will just put a placeholder rank or omit it.
    })
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.userId, userId),
        eq(gameSessions.status, 'completed')
      )
    )
    .orderBy(desc(gameSessions.serverEndedAt))
    .limit(5);

  const recentSessions: SessionHistoryItem[] = recentSessionsData.map((session: any) => {
    let scoreDisplay: number | string = session.score || 0;
    if (session.modeType === 'clicks') {
      scoreDisplay = `${((session.elapsedMs || 0) / 1000).toFixed(2)}s`;
    }
    
    // Formatting date
    const dateObj = session.serverEndedAt ? new Date(session.serverEndedAt) : new Date();
    const today = new Date();
    const isToday = dateObj.getDate() === today.getDate() && dateObj.getMonth() === today.getMonth() && dateObj.getFullYear() === today.getFullYear();
    const dateDisplay = isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return {
      id: session.id,
      date: dateDisplay,
      mode: session.modeType === 'timer' ? 'Timer' : 'Clicks',
      score: scoreDisplay,
      rank: '-', // Placeholder as rank requires complex global aggregation
    };
  });

  const { passwordHash, failedLoginAttempts, lockedUntil, ...safeUser } = user;

  return {
    ...safeUser,
    stats,
    recentSessions,
  };
}

export async function updateUserProfile(userId: string, data: UpdateProfilePayload) {
  const [updatedUser] = await db
    .update(users)
    .set({
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      settings: data.settings,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updatedUser) {
    throw new AppError(404, 'User not found');
  }

  const { passwordHash, failedLoginAttempts, lockedUntil, ...safeUser } = updatedUser;
  return safeUser;
}

export async function deleteUser(userId: string) {
  const [deletedUser] = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (!deletedUser) {
    throw new AppError(404, 'User not found');
  }
}
