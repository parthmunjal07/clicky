import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { gameSessions } from '../db/schema.js';
import { hotStore } from './hotStore.js';
import type { HotStoreEntry } from './hotStore.js';
import { AppError } from '../auth/service.js';
import { validateGamePhysics } from './validation.js';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Grace period for accepting clicks after timer expires (network jitter) */
const CLICK_GRACE_MS = 300;

/** /game/end may be called this many ms before the timer officially expires */
const END_EARLY_TOLERANCE_MS = 500;

/** /game/end may be called this many ms after the timer officially expires */
const END_LATE_TOLERANCE_MS = 2000;

/** Maximum sustained clicks per second — anything above is flagged as inhuman */
const MAX_CPS = 20;

/** Rolling window size for CPS detection (ms) */
const CPS_WINDOW_MS = 1000;

/** Stale session threshold: timer mode gets 1 min past deadline */
const TIMER_STALE_BUFFER_MS = 60_000;

/** Stale session threshold: clicks mode gets 5 min max session time */
const CLICKS_MAX_SESSION_MS = 300_000;

/** Sweep interval for expiring stale sessions */
const SWEEP_INTERVAL_MS = 60_000;

// ─── Sort Direction Helper ──────────────────────────────────────────────────
// IMPORTANT: Leaderboard queries must sort differently by mode:
//   timer  → higher score is better (more clicks)       → ORDER BY score DESC
//   clicks → lower score is better  (faster completion) → ORDER BY score ASC
//
// This helper prevents the silent bug of ORDER BY score DESC everywhere.

export function getSortDirection(modeType: 'timer' | 'clicks'): 'asc' | 'desc' {
  return modeType === 'timer' ? 'desc' : 'asc';
}

// ─── Start Session ──────────────────────────────────────────────────────────

export async function startSession(
  userId: string,
  modeType: 'timer' | 'clicks',
  modeValue: number,
) {
  // ── One active session per user ──
  const existingHotSession = hotStore.findActiveByUserId(userId);
  if (existingHotSession) {
    throw new AppError(409, 'You already have an active game session. Finish or abandon it first.');
  }

  // ── Check DB for orphaned active sessions (survives server restart) ──
  const orphanedSessions = await db
    .select({ id: gameSessions.id })
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.userId, userId),
        eq(gameSessions.status, 'active'),
      ),
    );

  if (orphanedSessions.length > 0) {
    // Auto-expire orphaned sessions
    await db
      .update(gameSessions)
      .set({
        status: 'expired',
        serverEndedAt: new Date(),
      })
      .where(
        and(
          eq(gameSessions.userId, userId),
          eq(gameSessions.status, 'active'),
        ),
      );
  }

  // ── Create DB row ──
  const now = new Date();

  const [session] = await db
    .insert(gameSessions)
    .values({
      userId,
      modeType,
      modeValue,
      status: 'active',
      serverStartedAt: now,
    })
    .returning({
      id: gameSessions.id,
      serverStartedAt: gameSessions.serverStartedAt,
    });

  // ── Initialize hot store ──
  const nowMs = now.getTime();

  hotStore.create(session!.id, {
    userId,
    clicks: 0,
    modeType,
    modeValue,
    serverStartedAt: nowMs,
    lastClickAt: nowMs,
    recentClickTimestamps: [],
    lastSeqNum: -1,
  });

  return {
    sessionId: session!.id,
    serverStartedAt: session!.serverStartedAt.toISOString(),
  };
}

// ─── Record Single Click ────────────────────────────────────────────────────

export async function recordClick(
  userId: string,
  sessionId: string,
  seqNum?: number,
) {
  const entry = getValidatedEntry(sessionId, userId);
  const now = Date.now();

  // ── Idempotency check ──
  if (seqNum !== undefined && seqNum <= entry.lastSeqNum) {
    return buildClickResponse(entry);
  }

  // ── Timer mode: reject if time expired (with grace) ──
  if (entry.modeType === 'timer') {
    const deadline = entry.serverStartedAt + entry.modeValue * 1000 + CLICK_GRACE_MS;
    if (now > deadline) {
      throw new AppError(400, 'Session time has expired.');
    }
  }

  // ── CPS anti-cheat ──
  validateClickRate(entry, now, 1);

  // ── Record the click ──
  entry.clicks += 1;
  entry.lastClickAt = now;
  entry.recentClickTimestamps.push(now);
  if (seqNum !== undefined) {
    entry.lastSeqNum = seqNum;
  }

  hotStore.update(sessionId, entry);

  // ── Clicks mode: auto-finalize when target reached ──
  if (entry.modeType === 'clicks' && entry.clicks >= entry.modeValue) {
    return finalizeClicksMode(sessionId, entry, now);
  }

  return buildClickResponse(entry);
}

// ─── Record Click Batch ─────────────────────────────────────────────────────

export async function recordClickBatch(
  userId: string,
  sessionId: string,
  count: number,
  seqNum: number,
) {
  const entry = getValidatedEntry(sessionId, userId);
  const now = Date.now();

  // ── Idempotency check ──
  if (seqNum <= entry.lastSeqNum) {
    return buildClickResponse(entry);
  }

  // ── Timer mode: reject if time expired (with grace) ──
  if (entry.modeType === 'timer') {
    const deadline = entry.serverStartedAt + entry.modeValue * 1000 + CLICK_GRACE_MS;
    if (now > deadline) {
      throw new AppError(400, 'Session time has expired.');
    }
  }

  // ── Batch anti-cheat: validate count against elapsed time ──
  validateClickRate(entry, now, count);

  // ── Record the batch ──
  entry.clicks += count;
  entry.lastClickAt = now;
  entry.lastSeqNum = seqNum;
  // For batches, we record a single timestamp (the batch arrival time)
  entry.recentClickTimestamps.push(now);

  hotStore.update(sessionId, entry);

  // ── Clicks mode: auto-finalize when target reached ──
  if (entry.modeType === 'clicks' && entry.clicks >= entry.modeValue) {
    // Cap clicks at target — don't over-count
    entry.clicks = entry.modeValue;
    hotStore.update(sessionId, entry);
    return finalizeClicksMode(sessionId, entry, now);
  }

  return buildClickResponse(entry);
}

// ─── End Session (Timer Mode Only) ──────────────────────────────────────────

export async function endSession(userId: string, sessionId: string) {
  const entry = getValidatedEntry(sessionId, userId);

  // ── Only timer mode uses /game/end ──
  if (entry.modeType !== 'timer') {
    throw new AppError(400, 'Clicks-mode sessions auto-finalize when the target is reached. Do not call /game/end.');
  }

  const now = Date.now();
  const sessionEndTime = entry.serverStartedAt + entry.modeValue * 1000;

  // ── Validate timing window ──
  // Allow /game/end from 500ms before deadline to 2s after
  if (now < sessionEndTime - END_EARLY_TOLERANCE_MS) {
    throw new AppError(400, 'Session has not ended yet. Wait for the timer to expire.');
  }

  // If the client calls very late, we still finalize — they just can't
  // add more clicks after the grace period (those are rejected by /game/click).

  // ── Persist to DB ──
  const score = entry.clicks;
  const elapsedMs = now - entry.serverStartedAt;
  
  // ── Final physics validation ──
  validateGamePhysics(score, elapsedMs);

  const serverEndedAt = new Date();

  await db
    .update(gameSessions)
    .set({
      status: 'completed',
      clickCount: score,
      score,
      serverEndedAt,
    })
    .where(eq(gameSessions.id, sessionId));

  // ── Clean up hot store ──
  hotStore.delete(sessionId);

  return {
    finalized: true,
    sessionId,
    modeType: entry.modeType,
    modeValue: entry.modeValue,
    score,
    clickCount: score,
  };
}

// ─── Get Session (Reconnect) ────────────────────────────────────────────────

export async function getSession(userId: string, sessionId: string) {
  // ── Try hot store first (active session) ──
  const entry = hotStore.get(sessionId);

  if (entry) {
    if (entry.userId !== userId) {
      throw new AppError(403, 'This session does not belong to you.');
    }

    const now = Date.now();
    const elapsedMs = now - entry.serverStartedAt;

    let timeRemainingMs: number | null = null;
    let clicksRemaining: number | null = null;

    if (entry.modeType === 'timer') {
      timeRemainingMs = Math.max(0, entry.modeValue * 1000 - elapsedMs);
    } else {
      clicksRemaining = Math.max(0, entry.modeValue - entry.clicks);
    }

    return {
      sessionId,
      status: 'active' as const,
      modeType: entry.modeType,
      modeValue: entry.modeValue,
      clicks: entry.clicks,
      elapsedMs,
      timeRemainingMs,
      clicksRemaining,
      serverStartedAt: new Date(entry.serverStartedAt).toISOString(),
    };
  }

  // ── Fall back to DB (completed/expired session) ──
  const [session] = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new AppError(404, 'Session not found.');
  }

  if (session.userId !== userId) {
    throw new AppError(403, 'This session does not belong to you.');
  }

  return {
    sessionId: session.id,
    status: session.status,
    modeType: session.modeType,
    modeValue: session.modeValue,
    clicks: session.clickCount,
    elapsedMs: session.elapsedMs,
    score: session.score,
    serverStartedAt: session.serverStartedAt.toISOString(),
    serverEndedAt: session.serverEndedAt?.toISOString() ?? null,
  };
}

// ─── Stale Session Sweep ────────────────────────────────────────────────────

export async function expireStaleSessionsFromHotStore(): Promise<number> {
  const now = Date.now();
  const staleIds: string[] = [];

  for (const [sessionId, entry] of hotStore.entries()) {
    let isStale = false;

    if (entry.modeType === 'timer') {
      // Timer mode: stale if 1 min past the deadline
      const deadline = entry.serverStartedAt + entry.modeValue * 1000 + TIMER_STALE_BUFFER_MS;
      isStale = now > deadline;
    } else {
      // Clicks mode: stale if 5 min have passed (reasonable upper bound)
      isStale = now > entry.serverStartedAt + CLICKS_MAX_SESSION_MS;
    }

    if (isStale) {
      staleIds.push(sessionId);
    }
  }

  for (const sessionId of staleIds) {
    const entry = hotStore.get(sessionId);
    if (!entry) continue;

    await db
      .update(gameSessions)
      .set({
        status: 'expired',
        clickCount: entry.clicks,
        serverEndedAt: new Date(),
      })
      .where(eq(gameSessions.id, sessionId));

    hotStore.delete(sessionId);
  }

  if (staleIds.length > 0) {
    console.log(`[sweep] Expired ${staleIds.length} stale session(s)`);
  }

  return staleIds.length;
}

/** Start the periodic sweep. Returns the interval handle for cleanup. */
export function startStaleSessionSweep(): ReturnType<typeof setInterval> {
  return setInterval(() => {
    expireStaleSessionsFromHotStore().catch((err) => {
      console.error('[sweep] Error expiring stale sessions:', err);
    });
  }, SWEEP_INTERVAL_MS);
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Look up a session in the hot store and validate ownership.
 * Throws if the session doesn't exist or doesn't belong to the caller.
 */
function getValidatedEntry(sessionId: string, userId: string): HotStoreEntry {
  const entry = hotStore.get(sessionId);

  if (!entry) {
    throw new AppError(404, 'Session not found or already ended.');
  }

  if (entry.userId !== userId) {
    throw new AppError(403, 'This session does not belong to you.');
  }

  return entry;
}

/**
 * CPS anti-cheat: reject if the incoming click rate implies inhuman speed.
 *
 * For single clicks: checks the rolling 1s window of recent timestamps.
 * For batches: validates count against time elapsed since last interaction.
 */
function validateClickRate(entry: HotStoreEntry, now: number, count: number): void {
  const windowStart = now - CPS_WINDOW_MS;

  // Prune timestamps outside the rolling window
  entry.recentClickTimestamps = entry.recentClickTimestamps.filter(
    (ts) => ts > windowStart,
  );

  // For batch: check if claimed count exceeds what's physically possible
  if (count > 1) {
    const timeSinceLastClick = now - entry.lastClickAt;
    if (timeSinceLastClick > 0) {
      const impliedCps = (count * 1000) / timeSinceLastClick;
      if (impliedCps > MAX_CPS) {
        throw new AppError(
          429,
          `Click rate too high. Batch of ${count} in ${timeSinceLastClick}ms implies ${impliedCps.toFixed(1)} CPS (max ${MAX_CPS}).`,
        );
      }
    }
  }

  // Check rolling window: total recent clicks (including this one) must not exceed MAX_CPS
  const recentClickCount = entry.recentClickTimestamps.length + count;
  if (recentClickCount > MAX_CPS) {
    throw new AppError(
      429,
      `Click rate too high. ${recentClickCount} clicks in the last second exceeds the maximum of ${MAX_CPS} CPS.`,
    );
  }
}

/**
 * Finalize a clicks-mode session when the target is reached.
 * Computes elapsed_ms as the score (lower is better).
 */
async function finalizeClicksMode(
  sessionId: string,
  entry: HotStoreEntry,
  now: number,
) {
  const elapsedMs = now - entry.serverStartedAt;
  
  // ── Final physics validation ──
  validateGamePhysics(entry.clicks, elapsedMs);

  const serverEndedAt = new Date(now);

  await db
    .update(gameSessions)
    .set({
      status: 'completed',
      clickCount: entry.clicks,
      elapsedMs,
      score: elapsedMs, // clicks mode: score = time taken (lower is better)
      serverEndedAt,
    })
    .where(eq(gameSessions.id, sessionId));

  hotStore.delete(sessionId);

  return {
    finalized: true,
    sessionId,
    modeType: entry.modeType,
    modeValue: entry.modeValue,
    score: elapsedMs,
    elapsedMs,
    clickCount: entry.clicks,
  };
}

/** Build the standard click response from a hot-store entry. */
function buildClickResponse(entry: HotStoreEntry) {
  const now = Date.now();
  const result: Record<string, unknown> = {
    finalized: false,
    clicks: entry.clicks,
  };

  if (entry.modeType === 'timer') {
    result.timeRemainingMs = Math.max(
      0,
      entry.modeValue * 1000 - (now - entry.serverStartedAt),
    );
  } else {
    result.clicksRemaining = Math.max(0, entry.modeValue - entry.clicks);
  }

  return result;
}
