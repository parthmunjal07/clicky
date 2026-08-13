import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../auth/middleware.js';
import * as usersService from './service.js';
import { updateProfileSchema } from './validation.js';
import { AppError } from '../auth/service.js';

const router = Router();

router.get(
  '/users/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) throw new AppError(401, 'Unauthorized');
      
      const profile = await usersService.getUserProfile(req.user.id);
      res.status(200).json({ user: profile });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/users/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) throw new AppError(401, 'Unauthorized');

      const data = updateProfileSchema.parse(req.body);
      const updatedUser = await usersService.updateUserProfile(req.user.id, data);
      
      res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/users/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) throw new AppError(401, 'Unauthorized');

      await usersService.deleteUser(req.user.id);
      
      // Clear cookies upon deletion
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.status(200).json({ message: 'Account deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
