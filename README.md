# Clicky

## Local Setup and Running

This project consists of a Node.js backend (Express + Drizzle ORM + PostgreSQL) and a React frontend (Vite + TailwindCSS).

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your `.env` file based on `.env.example`. Make sure you configure your PostgreSQL database URL.
4. Generate and run database migrations:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
5. (Optional) Seed the database:
   ```bash
   npm run seed
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Database Schema

The database uses PostgreSQL and is managed with Drizzle ORM. The core tables are:

- **`users`**: Stores user account information including `username`, `email`, `passwordHash`, `role` (user/admin), `avatarUrl`, and game `settings`. Also tracks failed login attempts for security.
- **`refresh_tokens`**: Manages secure session refreshes. Links to the `users` table and stores the `tokenHash`, expiration time, and metadata like `userAgent` and `ipAddress`.
- **`game_sessions`**: Records gameplay data. Links to a user and stores the `modeType` (timer/clicks), `modeValue` (e.g., 30 seconds), session `status` (active, completed, aborted), `clickCount`, `elapsedMs`, and the final `score`. Includes an optimized index for fast leaderboard queries.

## API Endpoints

### Authentication
- `POST /auth/signup` - Create a new user account.
- `POST /auth/login` - Authenticate and receive access & refresh tokens (set as HTTP-only cookies).
- `POST /auth/refresh` - Get a new access token using a valid refresh token cookie.
- `POST /auth/logout` - Invalidate the current session and clear cookies.

### Users
- `GET /users/me` - Get the current authenticated user's profile and stats.
- `PATCH /users/me` - Update user profile details.
- `DELETE /users/me` - Delete the current user's account and clear sessions.

### Admin
- `GET /admin/users` - List all users (supports pagination and search).
- `GET /admin/users/:id/history` - View a specific user's game history and statistics.
- `POST /admin/users/:id/unlock` - Unlock a user account that was locked due to too many failed login attempts.

### Game
- `POST /game/start` - Start a new game session (returns a session ID).
- `POST /game/click` - Record a single click for the active session (requires `x-session-id` header).
- `POST /game/click-batch` - Record multiple clicks in a batch for the active session.
- `POST /game/end` - End the current game session and calculate the final score.
- `POST /game/abandon` - Abort the active game session.
- `GET /game/session/:id` - Retrieve details of a specific game session.

### Leaderboard
- `GET /leaderboard/:timeframe` - Fetch leaderboard rankings. `timeframe` can be `global`, `monthly`, `weekly`, or `daily`. Accepts query parameters `mode` (e.g., timer, clicks) and `value` (e.g., 30) to filter the results.
