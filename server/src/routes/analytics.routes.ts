import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { NotFoundError } from '../utils/errors';
import * as analyticsService from '../services/analytics.service';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// GET /analytics/profile - Get profile analytics for the authenticated user
router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);
    const analytics = await analyticsService.getProfileAnalytics(req.user!.userId, days);
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

// GET /analytics/posts/:id - Get analytics for a specific post
router.get('/posts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analytics = await analyticsService.getPostAnalytics(req.params.id, req.user!.userId);
    if (!analytics) {
      throw new NotFoundError('Post');
    }
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

export default router;
