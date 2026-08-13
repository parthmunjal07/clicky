// ─── Hot Store ────────────────────────────────────────────────────────────────
// In-memory click state for active game sessions.
//
// WHY: Writing to Postgres on every click (10–20 writes/sec per player) is
// wasteful — the game only cares about the final result. We keep live state
// here and persist to Postgres once when the session ends.
//
// This module is abstracted behind an interface so swapping the Map for Redis
// is a one-file change, not a rewrite.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HotStoreEntry {
  userId: string;
  clicks: number;
  modeType: 'timer' | 'clicks';
  modeValue: number;
  serverStartedAt: number; // epoch ms — fast arithmetic, no Date overhead
  lastClickAt: number; // epoch ms
  recentClickTimestamps: number[]; // rolling 1s window for CPS anti-cheat
  lastSeqNum: number; // idempotency: last accepted sequence number
}

export interface HotStore {
  create(sessionId: string, entry: HotStoreEntry): void;
  get(sessionId: string): HotStoreEntry | undefined;
  update(sessionId: string, entry: HotStoreEntry): void;
  delete(sessionId: string): void;
  findActiveByUserId(userId: string): string | undefined;
  entries(): IterableIterator<[string, HotStoreEntry]>;
}

// ─── In-Memory Implementation ───────────────────────────────────────────────

class InMemoryHotStore implements HotStore {
  /** Primary store: sessionId → entry */
  private sessions = new Map<string, HotStoreEntry>();
  /** Secondary index: userId → sessionId for O(1) active-session lookup */
  private userIndex = new Map<string, string>();

  create(sessionId: string, entry: HotStoreEntry): void {
    this.sessions.set(sessionId, entry);
    this.userIndex.set(entry.userId, sessionId);
  }

  get(sessionId: string): HotStoreEntry | undefined {
    return this.sessions.get(sessionId);
  }

  update(sessionId: string, entry: HotStoreEntry): void {
    this.sessions.set(sessionId, entry);
  }

  delete(sessionId: string): void {
    const entry = this.sessions.get(sessionId);
    if (entry) {
      this.userIndex.delete(entry.userId);
    }
    this.sessions.delete(sessionId);
  }

  findActiveByUserId(userId: string): string | undefined {
    return this.userIndex.get(userId);
  }

  entries(): IterableIterator<[string, HotStoreEntry]> {
    return this.sessions.entries();
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────────

export const hotStore: HotStore = new InMemoryHotStore();
