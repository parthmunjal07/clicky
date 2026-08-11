# Authentication System — Token Flow & Setup

## Overview

This is a stateless JWT-based authentication API with server-side refresh token management. It supports signup, login, token refresh with rotation, logout, profile retrieval, and admin-only endpoints with role gating.

---

## Token Architecture

### Access Token
- **Purpose**: Short-lived, stateless proof of identity for API requests
- **Lifetime**: 15 minutes
- **Signed with**: `JWT_ACCESS_SECRET`
- **Payload**: `{ sub: userId, role: 'user' | 'admin', iat, exp }`
- **Storage**: Client-side only (memory or secure storage)
- **Validation**: Signature + expiry check only — **never** checked against the DB. This is what makes access tokens fast and stateless.

### Refresh Token
- **Purpose**: Long-lived credential used solely to obtain new access tokens
- **Lifetime**: 7 days
- **Signed with**: `JWT_REFRESH_SECRET` (separate secret from access tokens)
- **Storage**: Client sends it in request body to `POST /auth/refresh`
- **Server-side**: Stored as a **SHA-256 hash** in the `refresh_tokens` table. A leaked database does not leak usable refresh tokens.
- **Validation**: Signature + expiry + DB lookup (must exist and not be revoked)

---

## Token Flow

```
┌─────────┐                          ┌─────────┐                    ┌────────┐
│  Client  │                          │  Server  │                    │   DB   │
└────┬────┘                          └────┬────┘                    └───┬────┘
     │                                     │                            │
     │  POST /auth/login                   │                            │
     │  { email, password }                │                            │
     ├────────────────────────────────────►│                            │
     │                                     │  verify credentials        │
     │                                     ├───────────────────────────►│
     │                                     │  store refresh token hash  │
     │                                     ├───────────────────────────►│
     │  { accessToken, refreshToken }      │                            │
     │◄────────────────────────────────────┤                            │
     │                                     │                            │
     │  GET /auth/me                       │                            │
     │  Authorization: Bearer <access>     │                            │
     ├────────────────────────────────────►│                            │
     │                                     │  verify JWT signature      │
     │  { user profile }                   │  (no DB call)              │
     │◄────────────────────────────────────┤                            │
     │                                     │                            │
     │  POST /auth/refresh                 │                            │
     │  { refreshToken }                   │                            │
     ├────────────────────────────────────►│                            │
     │                                     │  hash token, lookup in DB  │
     │                                     ├───────────────────────────►│
     │                                     │  revoke old, store new     │
     │                                     ├───────────────────────────►│
     │  { new accessToken, refreshToken }  │                            │
     │◄────────────────────────────────────┤                            │
     │                                     │                            │
```

---

## Refresh Token Rotation & Reuse Detection

Every call to `POST /auth/refresh`:
1. Verifies the JWT signature and expiry of the old refresh token
2. Hashes the old token and looks it up in the `refresh_tokens` table
3. **If the token is already revoked** → this means a previously-rotated token was reused (likely stolen). **All sessions for that user are immediately revoked** as a security measure.
4. If the token is valid and not revoked → revoke it, issue a new access + refresh token pair

This limits the damage window of a stolen refresh token: the attacker can use it at most once before the legitimate user's next refresh triggers full revocation.

---

## Account Lockout

- After **5 consecutive failed login attempts**, the account is locked for **15 minutes**
- The `locked_until` timestamp is checked on every login attempt
- A successful login **resets** the failed attempt counter and clears the lock
- Login responses always return the generic message `"Invalid email or password"` — never revealing whether the email exists or the password was wrong

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/signup` | None | Register a new user |
| `POST` | `/auth/login` | None | Authenticate and receive tokens |
| `POST` | `/auth/refresh` | None | Rotate refresh token, get new pair |
| `POST` | `/auth/logout` | Bearer | Revoke the refresh token |
| `GET` | `/auth/me` | Bearer | Get current user's profile |
| `GET` | `/admin/users` | Bearer (admin) | Paginated user list |
| `GET` | `/health` | None | Health check |

### Rate Limiting
- `/auth/login` and `/auth/signup` are rate-limited to **5 requests per 15 minutes** per IP address

---

## Seeding the Admin Account

The admin account is **never** created through the public signup endpoint. It is seeded via a dedicated script that reads credentials from environment variables.

### Steps

1. Set the environment variables in your `.env` file:
   ```
   ADMIN_EMAIL=admin@clicky.dev
   ADMIN_PASSWORD=a_strong_password_here
   ```

2. Ensure the database is running and migrations are applied:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

3. Run the seed script:
   ```bash
   npm run seed
   ```

4. The script will:
   - Check if an admin account already exists (by role)
   - If not, hash the password with bcrypt (cost factor 12) and create the admin user
   - If an admin already exists, log a message and exit cleanly

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No (default: 5000) | Server port |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | Secret for signing access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens (min 32 chars) |
| `ADMIN_EMAIL` | Yes | Email for the seeded admin account |
| `ADMIN_PASSWORD` | Yes | Password for the seeded admin account (min 10 chars) |
| `CORS_ORIGIN` | Yes | Comma-separated list of allowed origins |

Generate secure secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Project Structure

```
src/
  config/
    env.ts          # Validated environment config (fails fast on boot)
  db/
    schema.ts       # Drizzle schema (users + refresh_tokens tables)
    client.ts       # Drizzle client instance
    seed.ts         # Admin account seed script
  auth/
    validation.ts   # Zod schemas (signup, login, refresh)
    service.ts      # Business logic (no HTTP concerns)
    routes.ts       # Express route handlers + error handler
    middleware.ts   # authenticate + requireRole middleware
  server.ts         # App entry point (Express + middleware)
```

---

## Security Checklist

- [x] Passwords hashed with bcrypt (cost factor 12)
- [x] Refresh tokens stored as SHA-256 hashes (leaked DB ≠ leaked tokens)
- [x] Refresh token rotation with reuse detection
- [x] Generic login error messages (no email/password enumeration)
- [x] Account lockout after 5 failed attempts (15-minute window)
- [x] Rate limiting on login/signup (5 req/15 min per IP)
- [x] CORS with explicit allow-list (no `*`)
- [x] Helmet security headers
- [x] Input validation on every route via Zod (`.strict()` rejects unknown fields)
- [x] All secrets from environment variables (validated at boot)
- [x] Admin created only via seed script (signup always defaults to `role: 'user'`)
- [x] Access tokens are stateless (no DB calls to validate)
- [x] Request body size limited to 10KB
