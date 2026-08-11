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

router.post(
  '/auth/signup',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = signupSchema.parse(req.body);
      const result = await authService.signup(data, getMeta(req));

      res.status(201).json({
        message: 'Account created successfully',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
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

      res.status(200).json({
        message: 'Login successful',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
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
      const { refreshToken } = refreshSchema.parse(req.body);
      const tokens = await authService.refresh(refreshToken, getMeta(req));

      res.status(200).json({
        message: 'Tokens refreshed successfully',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
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
      const { refreshToken } = refreshSchema.parse(req.body);
      await authService.logout(refreshToken);

      res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /auth/me ───────────────────────────────────────────────────────────

router.get(
  '/auth/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.getProfile(req.user!.id);
      res.status(200).json({ user });
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

      const result = await authService.listUsers(page, limit);
      res.status(200).json(result);
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
