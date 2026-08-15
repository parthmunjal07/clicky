import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as leaderboardService from './service.js';
import { z } from 'zod';

const router = Router();

const querySchema = z.object({
  mode: z.enum(['timer', 'clicks', 'cps']).default('timer'),
  value: z.coerce.number().default(30),
});

const paramSchema = z.object({
  timeframe: z.enum(['global', 'monthly', 'weekly', 'daily']),
});

router.get(
  '/leaderboard/:timeframe',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { timeframe } = paramSchema.parse(req.params);
      const { mode, value } = querySchema.parse(req.query);

      const leaderboard = await leaderboardService.getLeaderboard(mode, value, timeframe);
      
      res.status(200).json({ leaderboard });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
