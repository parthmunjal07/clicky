# Game Session System — Architecture & API

## Overview

This module handles the core gameplay loop: starting a session, tracking clicks, validating them server-side, computing the score, and persisting results. It sits behind the auth module — all endpoints require a valid JWT.

---

## ⚡ Key Design Decision: Hot-Path / Cold-Path Split

**The single most important architectural decision in this module.**

If every click hit the database, you'd be doing 10–20 writes/sec per active player for no reason — the game only cares about the final result. Instead:

| Path | Storage | When | What |
|------|---------|------|------|
| **Hot path** (clicks) | In-memory `Map` (keyed by `session_id`) | Every click | Increment counter, run anti-cheat checks |
| **Cold path** (results) | Postgres `game_sessions` table | Session end only | Persist final `click_count`, `score`, `elapsed_ms` |

### Why not Redis?

The hot store is abstracted behind a `HotStore` interface (`src/game/hotStore.ts`). The default implementation uses a plain `Map` — fine for single-instance deployments. To scale horizontally, swap in a Redis-backed implementation **in one file** without touching any business logic.

### What happens if the server crashes mid-game?

Active sessions in the hot store are lost. The DB row (created at `/game/start`) remains with `status: 'active'`. On the user's next `/game/start`, these orphaned rows are auto-expired. This is an acceptable trade-off: in-progress game data is transient and low-value compared to the complexity of durable in-memory state.

---

## ⚠️ Key Design Decision: Sort Direction by Mode Type

**Leaderboard queries must sort differently depending on the mode:**

| Mode | Score Meaning | Sort Direction | Better Score |
|------|--------------|----------------|--------------|
| `timer` | Total clicks within time limit | `DESC` | Higher (more clicks) |
| `clicks` | Milliseconds to reach target | `ASC` | Lower (faster time) |

A helper is provided to prevent the silent bug of `ORDER BY score DESC` everywhere:

```typescript
import { getSortDirection } from './game/service.js';

// Returns 'desc' for timer, 'asc' for clicks
const direction = getSortDirection(modeType);
```

**Always use this helper in leaderboard queries.** Never hard-code sort direction.

---

## Game Modes

### Timer Mode
- **Values**: 30s, 20s, 10s
- **Objective**: Click as many times as possible within the time limit
- **Score**: `click_count` (higher is better)
- **End condition**: Client calls `POST /game/end` after the timer expires

### Clicks Mode
- **Values**: 50, 25, 10 clicks
- **Objective**: Reach the target click count as fast as possible
- **Score**: `elapsed_ms` (lower is better)
- **End condition**: Auto-finalizes server-side when `click_count >= mode_value` — no `/game/end` call needed

---

## API Endpoints

All endpoints require `Authorization: Bearer <access_token>`.

Click and end endpoints require `X-Session-Id: <session_id>` header.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/game/start` | Start a new game session |
| `POST` | `/game/click` | Record a single click |
| `POST` | `/game/click-batch` | Record a batch of clicks |
| `POST` | `/game/end` | End a timer-mode session |
| `GET` | `/game/session/:id` | Get session state (reconnect support) |

### POST /game/start

**Request:**
```json
{
  "mode_type": "timer",
  "mode_value": 30
}
```

**Response (201):**
```json
{
  "sessionId": "uuid",
  "serverStartedAt": "2024-01-15T10:30:00.000Z"
}
```

**Errors:**
- `409` — User already has an active session
- `400` — Invalid `mode_value` for the given `mode_type`

### POST /game/click

**Headers:** `X-Session-Id: <session_id>`

**Request:**
```json
{
  "seq_num": 1
}
```

**Response (200):**
```json
{
  "finalized": false,
  "clicks": 15,
  "timeRemainingMs": 22450
}
```

If clicks-mode target is reached:
```json
{
  "finalized": true,
  "sessionId": "uuid",
  "modeType": "clicks",
  "modeValue": 50,
  "score": 12340,
  "elapsedMs": 12340,
  "clickCount": 50
}
```

### POST /game/click-batch

**Headers:** `X-Session-Id: <session_id>`

**Request:**
```json
{
  "count": 5,
  "seq_num": 3
}
```

**Response:** Same shape as `/game/click`.

### POST /game/end

**Headers:** `X-Session-Id: <session_id>`

Timer mode only. Clicks mode auto-finalizes.

**Response (200):**
```json
{
  "finalized": true,
  "sessionId": "uuid",
  "modeType": "timer",
  "modeValue": 30,
  "score": 187,
  "clickCount": 187
}
```

### GET /game/session/:id

For reconnect support — recover state if the client refreshes mid-round.

**Active session response:**
```json
{
  "sessionId": "uuid",
  "status": "active",
  "modeType": "timer",
  "modeValue": 30,
  "clicks": 42,
  "elapsedMs": 15230,
  "timeRemainingMs": 14770,
  "clicksRemaining": null,
  "serverStartedAt": "2024-01-15T10:30:00.000Z"
}
```

**Completed session response:**
```json
{
  "sessionId": "uuid",
  "status": "completed",
  "modeType": "clicks",
  "modeValue": 50,
  "clicks": 50,
  "elapsedMs": 12340,
  "score": 12340,
  "serverStartedAt": "2024-01-15T10:30:00.000Z",
  "serverEndedAt": "2024-01-15T10:30:12.340Z"
}
```

---

## Session Lifecycle

```
┌─────────┐                          ┌─────────┐         ┌──────────┐     ┌────────┐
│  Client  │                          │  Server  │         │ Hot Store │     │   DB   │
└────┬────┘                          └────┬────┘         └─────┬────┘     └───┬────┘
     │                                     │                    │              │
     │  POST /game/start                  │                    │              │
     │  { mode_type, mode_value }         │                    │              │
     ├───────────────────────────────────►│                    │              │
     │                                     │  INSERT active row │              │
     │                                     ├──────────────────────────────────►│
     │                                     │  create entry      │              │
     │                                     ├───────────────────►│              │
     │  { sessionId, serverStartedAt }    │                    │              │
     │◄───────────────────────────────────┤                    │              │
     │                                     │                    │              │
     │  POST /game/click (×N)             │                    │              │
     │  X-Session-Id: <id>                │                    │              │
     ├───────────────────────────────────►│                    │              │
     │                                     │  validate + incr   │              │
     │                                     ├───────────────────►│  (no DB!)   │
     │  { clicks, timeRemainingMs }       │                    │              │
     │◄───────────────────────────────────┤                    │              │
     │                                     │                    │              │
     │  POST /game/end                    │                    │              │
     ├───────────────────────────────────►│                    │              │
     │                                     │  read final count  │              │
     │                                     ├───────────────────►│              │
     │                                     │  UPDATE completed  │              │
     │                                     ├──────────────────────────────────►│
     │                                     │  delete entry      │              │
     │                                     ├───────────────────►│              │
     │  { score, clickCount }             │                    │              │
     │◄───────────────────────────────────┤                    │              │
```

---

## Anti-Cheat & Integrity Measures

### Server-Authoritative Timing
- `server_started_at` / `server_ended_at` are the **only** source of truth for scoring
- Client-submitted timestamps are never trusted for scoring, only for UI display
- The server computes `elapsed_ms` for clicks mode, not the client

### Session Ownership
- Every `/game/click`, `/game/click-batch`, and `/game/end` call verifies `session.userId === jwt.sub`
- A stolen session ID is useless without the owner's JWT

### One Active Session Per User
- `POST /game/start` rejects if the user already has an active session
- Prevents parallel-session farming (play 10 games simultaneously, keep the best)
- Orphaned sessions (server restart) are auto-expired on next `/game/start`

### CPS Rate Limiting
- A rolling 1-second window tracks recent click timestamps in the hot store
- If sustained clicks/sec exceeds 20 CPS, the request is rejected with HTTP 429
- For batches: `count / timeSinceLastBatch` is validated against the same threshold
- This catches autoclickers without penalizing legitimate fast clicking

### Click Idempotency
- Optional `seq_num` (monotonically increasing) on single clicks; required on batches
- If a retried request has `seq_num <= lastSeqNum`, it's silently acknowledged (no double-count)
- Prevents network retries from inflating the score

### Stale Session Sweep
- A `setInterval(60s)` sweep expires abandoned sessions:
  - Timer mode: expired if 1 minute past deadline
  - Clicks mode: expired if 5 minutes have passed (reasonable upper bound)
- Writes `status: 'expired'` to DB and removes from hot store

---

## Project Structure

```
src/
  game/
    hotStore.ts       # HotStore interface + InMemoryHotStore (Map-backed)
    service.ts        # All gameplay business logic (no HTTP concerns)
    validation.ts     # Zod schemas for game endpoints
    routes.ts         # Thin Express route handlers
  db/
    schema.ts         # + game_sessions table, mode_type & session_status enums
  server.ts           # + mount gameRouter, start sweep interval
GAME.md               # This file
```

---

## Database Schema: game_sessions

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK, auto-generated |
| `user_id` | `uuid` | FK → users, cascade delete |
| `mode_type` | `enum('timer','clicks')` | Game mode |
| `mode_value` | `int` | 30/20/10 (timer) or 50/25/10 (clicks) |
| `status` | `enum('active','completed','expired','aborted')` | Session state |
| `server_started_at` | `timestamptz` | Server-authoritative start time |
| `server_ended_at` | `timestamptz` | Nullable — set on finalization |
| `click_count` | `int` | Final click count (0 while active) |
| `elapsed_ms` | `int` | Nullable — only for clicks mode scoring |
| `score` | `int` | Nullable — `click_count` (timer) or `elapsed_ms` (clicks) |
| `created_at` | `timestamptz` | Row creation time |

No separate `clicks` table — see hot-path/cold-path rationale above.
