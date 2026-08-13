import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  text,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const modeTypeEnum = pgEnum('mode_type', ['timer', 'clicks']);
export const sessionStatusEnum = pgEnum('session_status', [
  'active',
  'completed',
  'expired',
  'aborted',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 50 }),
  avatarUrl: varchar('avatar_url', { length: 255 }),
  settings: text('settings').default('{}'),
  role: userRoleEnum('role').notNull().default('user'),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});


export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  modeType: modeTypeEnum('mode_type').notNull(),
  modeValue: integer('mode_value').notNull(),
  status: sessionStatusEnum('status').notNull().default('active'),
  serverStartedAt: timestamp('server_started_at', { withTimezone: true }).notNull(),
  serverEndedAt: timestamp('server_ended_at', { withTimezone: true }),
  clickCount: integer('click_count').notNull().default(0),
  elapsedMs: integer('elapsed_ms'),
  score: integer('score'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});


export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type GameSession = typeof gameSessions.$inferSelect;
export type NewGameSession = typeof gameSessions.$inferInsert;
