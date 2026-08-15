import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../auth/middleware.js';
import { startGameSchema, clickSchema, clickBatchSchema } from './validation.js';
import * as gameService from './service.js';

const router = Router();

router.use('/game', authenticate);


router.post(
  '/game/start',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = startGameSchema.parse(req.body);
      const result = await gameService.startSession(
        req.user!.id,
        data.mode_type,
        data.mode_value,
      );

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);


router.post(
  '/game/click',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = clickSchema.parse(req.body);
      const sessionId = req.headers['x-session-id'] as string | undefined;

      if (!sessionId) {
        res.status(400).json({ error: 'x-session-id header is required' });
        return;
      }

      const result = await gameService.recordClick(
        req.user!.id,
        sessionId,
        data.seq_num,
      );

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);


router.post(
  '/game/click-batch',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = clickBatchSchema.parse(req.body);
      const sessionId = req.headers['x-session-id'] as string | undefined;

      if (!sessionId) {
        res.status(400).json({ error: 'x-session-id header is required' });
        return;
      }

      const result = await gameService.recordClickBatch(
        req.user!.id,
        sessionId,
        data.count,
        data.seq_num,
      );

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);


router.post(
  '/game/end',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.headers['x-session-id'] as string | undefined;

      if (!sessionId) {
        res.status(400).json({ error: 'x-session-id header is required' });
        return;
      }

      const result = await gameService.endSession(req.user!.id, sessionId);

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);


router.post(
  '/game/abandon',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await gameService.abandonSession(req.user!.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);


router.get(
  '/game/session/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.id as string;
      const result = await gameService.getSession(
        req.user!.id,
        sessionId,
      );

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);


export { startStaleSessionSweep } from './service.js';

export default router;
