import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { signupSchema, loginSchema, refreshSchema } from './validation.js';
import * as authService from './service.js';
import { AppError } from './service.js';
import { authenticate, requireRole } from './middleware.js';
import { ZodError } from 'zod';

const router = Router();

// ─── Helper: extract request metadata ───────────────────────────────────────

function getMeta(req: Request): { userAgent?: string; ip?: string } {
  const meta: { userAgent?: string; ip?: string } = {};
  const ua = req.headers['user-agent'];
  if (ua) meta.userAgent = ua;
  const ip = req.ip ?? req.socket.remoteAddress;
  if (ip) meta.ip = ip;
  return meta;
}

const isProd = process.env.NODE_ENV === 'production';
const accessCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes
};
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function setTokens(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, accessCookieOptions);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
}

router.post(
  '/auth/signup',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = signupSchema.parse(req.body);
      const result = await authService.signup(data, getMeta(req));

      setTokens(res, result.accessToken, result.refreshToken);

      res.status(201).json({
        message: 'Account created successfully',
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /auth/login ───────────────────────────────────────────────────────

router.post(
  '/auth/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.login(data, getMeta(req));

      setTokens(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        message: 'Login successful',
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /auth/refresh ─────────────────────────────────────────────────────

router.post(
  '/auth/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        throw new AppError(401, 'No refresh token provided');
      }

      const tokens = await authService.refresh(refreshToken, getMeta(req));
      setTokens(res, tokens.accessToken, tokens.refreshToken);

      res.status(200).json({
        message: 'Tokens refreshed successfully',
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /auth/logout ──────────────────────────────────────────────────────

router.post(
  '/auth/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },
);



// ─── GET /admin/users ───────────────────────────────────────────────────────

router.get(
  '/admin/users',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const search = req.query.search as string | undefined;

      const result = await authService.listUsers(page, limit, search);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /admin/users/:id/history ───────────────────────────────────────────

router.get(
  '/admin/users/:id/history',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) throw new AppError(400, 'User ID is required');
      // Reusing getUserProfile to get the same shape of history and stats
      // We will lazy-import usersService to avoid circular dependency issues if any
      const usersService = await import('../users/service.js');
      const profile = await usersService.getUserProfile(req.params.id as string);
      res.status(200).json({ user: profile });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /admin/users/:id/unlock ───────────────────────────────────────────

router.post(
  '/admin/users/:id/unlock',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) throw new AppError(400, 'User ID is required');
      const result = await authService.unlockUser(req.user!.id, req.params.id as string);
      res.status(200).json({ user: result });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Global Error Handler (mounted in server.ts, but exported for clarity) ──

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((e) => ({
        field: e.path.map(String).join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Unexpected errors — log but don't leak internals
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

export default router;
