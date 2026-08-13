import { eq, and, isNull, sql, lt } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db } from '../db/client.js';
import { users, refreshTokens } from '../db/schema.js';
import { env } from '../config/env.js';
import type { SignupInput, LoginInput } from './validation.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes in ms

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * SHA-256 hash a token for storage. We never store raw refresh tokens
 * in the database — a leaked DB shouldn't leak usable tokens.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate an access + refresh token pair.
 * The refresh token is stored server-side as a SHA-256 hash.
 */
async function generateTokenPair(
  user: { id: string; role: 'user' | 'admin' },
  meta?: { userAgent?: string; ip?: string },
) {
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );

  const refreshToken = jwt.sign(
    { sub: user.id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  );

  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
    userAgent: meta?.userAgent ?? null,
    ipAddress: meta?.ip ?? null,
  });

  return { accessToken, refreshToken };
}

// ─── Service Methods ────────────────────────────────────────────────────────

/**
 * Register a new user. Always assigns role 'user' — admin is seed-only.
 */
export async function signup(
  data: SignupInput,
  meta?: { userAgent?: string; ip?: string },
) {
  // Check username uniqueness
  const existingUsername = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, data.username))
    .limit(1);

  if (existingUsername.length > 0) {
    throw new AppError(409, 'Username is already taken');
  }

  // Check email uniqueness
  const existingEmail = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (existingEmail.length > 0) {
    throw new AppError(409, 'Email is already registered');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const [newUser] = await db
    .insert(users)
    .values({
      username: data.username,
      email: data.email,
      passwordHash,
      role: 'user', // Always user — admin is seed-only
    })
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    });

  const tokens = await generateTokenPair(
    { id: newUser!.id, role: newUser!.role },
    meta,
  );

  return { user: newUser!, ...tokens };
}

/**
 * Authenticate a user with email + password.
 * Handles account lockout and failed attempt tracking.
 */
export async function login(
  data: LoginInput,
  meta?: { userAgent?: string; ip?: string },
) {
  // Generic error — never reveal whether email exists or password is wrong
  const GENERIC_ERROR = 'Invalid email or password';

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (!user) {
    throw new AppError(401, GENERIC_ERROR);
  }

  // Check account lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMs = user.lockedUntil.getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    throw new AppError(
      423,
      `Account is locked. Try again in ${remainingMin} minute(s).`,
    );
  }

  // Verify password (bcrypt handles constant-time comparison internally)
  const passwordValid = await bcrypt.compare(data.password, user.passwordHash);

  if (!passwordValid) {
    const newAttempts = user.failedLoginAttempts + 1;

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      // Lock the account
      await db
        .update(users)
        .set({
          failedLoginAttempts: newAttempts,
          lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    } else {
      // Increment failed attempts
      await db
        .update(users)
        .set({
          failedLoginAttempts: newAttempts,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    throw new AppError(401, GENERIC_ERROR);
  }

  // Successful login — reset failed attempts and clear lockout
  await db
    .update(users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  const tokens = await generateTokenPair(
    { id: user.id, role: user.role },
    meta,
  );

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    ...tokens,
  };
}

/**
 * Rotate a refresh token. Implements reuse detection:
 * if a revoked token is reused, ALL sessions for that user are revoked
 * (signals token theft).
 */
export async function refresh(
  oldRefreshToken: string,
  meta?: { userAgent?: string; ip?: string },
) {
  // Verify the JWT signature and expiry
  let payload: { sub: string };
  try {
    payload = jwt.verify(oldRefreshToken, env.JWT_REFRESH_SECRET) as {
      sub: string;
    };
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(oldRefreshToken);

  // Look up the token in the database
  const [storedToken] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!storedToken) {
    throw new AppError(401, 'Invalid refresh token');
  }

  // ── Reuse detection ──
  // If the token was already revoked, someone is reusing a stolen token.
  // Revoke ALL sessions for this user as a safety measure.
  if (storedToken.revokedAt) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, storedToken.userId),
          isNull(refreshTokens.revokedAt),
        ),
      );

    throw new AppError(401, 'Refresh token reuse detected. All sessions revoked.');
  }

  // Check expiry
  if (storedToken.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token has expired');
  }

  // Revoke the old token
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, storedToken.id));

  // Look up the user for the new token pair
  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user) {
    throw new AppError(401, 'User not found');
  }

  // Issue a new token pair
  return generateTokenPair(user, meta);
}

/**
 * Revoke a single refresh token (logout).
 */
export async function logout(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
      sub: string;
    };
  } catch {
    // Even if the token is expired, try to revoke it by hash
  }

  const tokenHash = hashToken(refreshToken);

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
      ),
    );
}



/**
 * Paginated list of users (admin-only).
 */
export async function listUsers(page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit;

  const [usersList, countResult] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(users),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    users: usersList,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Error Class ────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
