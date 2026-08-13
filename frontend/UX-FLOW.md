# Click-Speed Game — Complete UX Flow

This document maps every screen a user can reach, every state each screen can be in, and every branch/edge case — so the UI gets built from actual journeys instead of four isolated mockups. Theme: soft neobrutalism (cream base, hard offset shadows, coral/yellow/teal accents, JetBrains Mono for numbers).

---

## 0. Entry & Auth Gate

**Trigger**: user opens the app (fresh visit or returning).

1. App mounts → silent `/auth/refresh` call fires before anything renders.
2. **Loading state**: a minimal splash — logo mark on cream background, no spinner text, just the logo doing its idle press-and-release pulse (reuses the signature interaction as a loading tell, not a separate spinner design).
3. **Refresh succeeds** → user + role loaded into store → redirect straight to **Home Hub** (2.4). Returning users never see the auth form.
4. **Refresh fails / no session** → redirect to **Auth Page** (0.1).

### 0.1 Auth Page
- Two tabs/toggle: **Login** / **Signup**, default to Login.
- **Login form**: email, password, submit. Inline field-level validation on blur, not on every keystroke (avoids error flicker while typing).
- **Signup form**: username, email, password, confirm password. Password strength hint shown live (matches backend's 10-char + common-password rule) so the user isn't surprised by a 400 on submit.
- **States**:
  - *Idle* — form ready.
  - *Submitting* — button shows spinner + disabled, inputs disabled, no layout shift.
  - *Field error* — red-bordered input (still black-outlined per theme, just an added red accent bar) with inline message below the field.
  - *Global error (wrong credentials)* — banner above the form, generic message only ("invalid email or password") per backend's security posture. Triggers the shake micro-animation already built.
  - *Account locked* — distinct banner, different color from generic error (e.g. amber, not red) — "Too many attempts. Try again in X minutes." Do not reuse the generic-error copy here; the user needs to know this is a cooldown, not a typo.
  - *Rate limited (429)* — same amber treatment, message built from the `Retry-After` header if present, else a generic "slow down and try again shortly."
- **Success** → tokens stored → redirect to **Home Hub**.

---

## 1. Home Hub (`/home`)

This is the hub screen every session returns to — not just a "mode select" screen, it's the persistent base of operations.

**Persistent elements on this screen and reachable from everywhere else post-login** (nav pattern — pick one, both are valid for this theme):
- Top bar: logo mark (left), current user's rank badge or best score (center/right), nav links to **Leaderboard**, **Profile**, **Admin** (admin role only), **Logout**.
- Or: bottom tab bar on mobile with the same four/five destinations as icon+label tabs.

**Home Hub content**:
1. Greeting / quick stat: "Welcome back, [username]" + their current best score or global rank, so there's an immediate payoff for returning.
2. **Mode Select** (the primary action on this screen):
   - Two mode-type toggle cards: **Timer** and **Clicks**.
   - Selecting a type reveals its three value options (Timer: 30s/20s/10s · Clicks: 50/25/10), shown as pill buttons.
   - A single **Start** button, disabled until both type and value are chosen, full-width, primary coral, uses the signature press-collapse effect.
3. Optional (nice-to-have, not required for MVP): a small "recent activity" strip — last 2–3 scores — so the hub isn't purely a launcher.

**States**:
- *Default* — as above.
- *Resuming an active session* — if the backend reports the user already has a `status: 'active'` session (they refreshed mid-game or opened a second tab), Start is replaced with a **Resume game** button instead of letting them start a new one — matches the backend's one-active-session-per-user rule. Show a small note: "You have a game in progress."
- *Loading initial stats* — skeleton blocks for the greeting/stat area only; don't block the mode selector on this, it can render immediately.

**Exit points**: Start → **Game Round**. Nav → Leaderboard / Profile / Admin / Logout.

---

## 2. Game Round (`/game/:sessionId`)

The screen users spend the most emotional energy on — motion and clarity matter most here.

### 2.1 Pre-round (optional but recommended)
Brief "3-2-1" countdown after `/game/start` returns and before clicks are accepted — gives the server a clean, unambiguous start boundary and gives the player a beat to get their hand ready. Skip this only if you want the absolute fastest possible loop; recommended to keep it since it also visually confirms the server's `server_started_at` before the timer starts moving.

### 2.2 Active round
- Center: the pulse-button (Timer mode) — every click = full press-collapse-spring.
- **Timer mode**: countdown above the button, JetBrains Mono, switches to coral fill under 10s. Live click count below the button.
- **Clicks mode**: instead of a countdown, show **progress toward target** (e.g. "23 / 50") — the framing inverts from "beat the clock" to "reach the target," and the UI should reflect that difference, not reuse the timer's visual language. An elapsed-time readout (ticking up, not down) replaces the countdown.
- No other UI competes for attention during an active round — no nav bar, no leaderboard peek.

### 2.3 Round end
- **Timer mode**: ends automatically when time hits zero (client stops accepting input, flushes final batch, calls `/game/end`).
- **Clicks mode**: ends automatically when target is hit (server auto-finalizes, frontend detects via the click-batch response).
- **Results panel** slides up from the bottom (doesn't navigate away — keeps the just-played round in view):
  - Final score (large, Archivo Black + mono number).
  - "New personal best" badge if applicable (tilted sticker, reserved color).
  - Current rank on the relevant leaderboard for this mode (fetched as part of `/game/end`'s response if you built it that way).
  - Three actions: **Play again** (same mode, straight back to pre-round), **Change mode** (back to Home Hub), **View leaderboard**.

### 2.4 Edge cases specific to this screen
- **Client-server score mismatch**: if the server's authoritative count differs from what the client tracked locally, the results panel shows the server's number — briefly animate from the client's last-seen number to the server's number rather than just swapping instantly, so the correction is visible rather than looking like a glitch.
- **Network drop mid-round**: click batches queue locally and retry with backoff; show a small non-blocking "reconnecting…" indicator near the click counter (not a full-screen error — don't interrupt the round for a transient drop). If the round's timer expires while offline, still attempt to flush and finalize once connectivity returns; if `/game/end` ultimately fails, show a distinct "couldn't save this round" state in the results panel rather than fabricating a score.
- **Page refresh / accidental navigation mid-round**: on remount, check for an active session via `GET /game/session/:id`; if found, resume the timer from recomputed elapsed time and rejoin. If the round would already be over server-side, skip straight to whatever `/game/end` reports.
- **Session ownership conflict** (session belongs to someone else / expired session id in URL): redirect to Home Hub with a small toast, not a hard error page.

---

## 3. Leaderboard (`/leaderboard`)

Reachable from nav at any time, not just post-game.

- **Filter row**: range tabs (Global / Daily / Weekly / Monthly) + mode filter (Timer / Clicks, and optionally the specific value like "30s" vs "all Timer"). Filters are independent — remember the user's last-used combination for the session (not persisted across logins unless you want that).
- **List**: ranked rows, current user's row visually pinned/highlighted wherever it falls.
- **States**:
  - *Loaded with data* — standard list.
  - *Empty* (e.g. Daily leaderboard before anyone's played today) — friendly empty state, not a blank list: "No scores yet today — be the first" with a Start button shortcut back into mode select.
  - *User has no rank yet* on this specific leaderboard (hasn't played that mode/range) — don't show a broken "your rank: undefined"; show "You haven't played this mode yet" beneath the list instead of pinning a phantom row.
  - *Loading* — skeleton rows, not a spinner, so the layout doesn't jump when data arrives.
  - *Refresh-in-progress* (polling tick) — subtle, e.g. a tiny pulsing dot near the filter row, not a full loading state that disrupts reading.
- **Live-ish update**: right after the user's own game ends, this list (if visited) reflects their new score immediately via query invalidation, ahead of the next poll tick.

---

## 4. Profile (`/profile`)

- Header: username, personal best per mode (Timer best / Clicks best — two separate numbers, don't conflate), any #1 badges earned.
- Score trend chart — see the earlier note on plotting Timer vs Clicks scores separately since "better" points in opposite directions for each.
- Session history list, most recent first, paginated or infinite-scroll if it grows long.
- **States**:
  - *New user, no history* — empty state with a direct "Play your first round" CTA, not just an empty table.
  - *Loaded*.

---

## 5. Admin (`/admin`, admin role only)

- Only reachable via nav item that's simply absent for normal users (not shown-then-blocked — don't tease a feature a user can't access).
- `GET /admin/users`: paginated user list — username, email, role, join date, maybe last-active.
- Minimum viable admin actions: view user list, view a user's game history (for support/debugging), and whatever moderation actions you decide to add later (e.g. reset a suspicious score, lock an account manually). Keep this screen plain/utilitarian — it doesn't need the full charm treatment of player-facing screens; clarity beats personality here.
- **Client-side gate is UX only** — `AdminRoute` hides/redirects for non-admins, but this is not the security boundary; the backend's `requireRole('admin')` is.

---

## 6. Global states that apply across every screen

- **Session expiry mid-use** (access token expires while the user is idle on a screen): silent refresh attempt on the next API call; if that also fails, redirect to Auth Page with a "session expired, please log in again" toast — never a jarring blank/broken screen.
- **Offline**: a slim top banner ("You're offline") appears app-wide when connectivity drops, independent of the in-game reconnecting indicator (2.4) which is more specific/urgent.
- **404 / unknown route**: simple on-brand not-found screen with a Home Hub link, styled consistently (not a framework default error page).
- **Logout**: immediate, clears in-memory token + revokes refresh token server-side, redirect to Auth Page. No confirmation modal needed for logout — it's a low-cost, easily-reversible action.

---

## 7. Screen-to-component checklist (for UI build handoff)

| Screen | Key components |
|---|---|
| Auth | AuthCard, InputField, ErrorBanner, LockoutBanner, SubmitButton |
| Home Hub | TopNav/TabBar, StatSummary, ModeToggleCard, ValuePillGroup, StartButton, ResumeBanner |
| Game Round | PulseButton, TimerBadge, ClickCounterBadge, ProgressBadge (Clicks mode), ResultsPanel, ReconnectingIndicator |
| Leaderboard | FilterTabs, ModeFilter, LeaderboardRow, EmptyState, SkeletonRow |
| Profile | ProfileHeader, BestScoreCard, TrendChart, HistoryRow, EmptyState |
| Admin | UserTable, PaginationControl |
| Global | OfflineBanner, Toast, NotFoundScreen |

Build components in this order for fastest path to a demoable app: **Auth → Home Hub → Game Round → Leaderboard → Profile → Admin** — each stage is playable/testable on its own before the next depends on it.
