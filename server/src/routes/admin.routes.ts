import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import * as moderationService from '../services/moderation.service';

const router = Router();

// All admin routes require authentication and ADMIN or MODERATOR role
router.use(authenticate);
router.use(requireRole('ADMIN', 'MODERATOR'));

const resolveReportSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
});

const takeActionSchema = z.object({
  targetId: z.string(),
  action: z.enum(['WARN', 'MUTE', 'SUSPEND', 'BAN', 'CONTENT_REMOVE', 'CONTENT_HIDE']),
  reason: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
});

// GET /admin/reports - Get pending reports
router.get('/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const result = await moderationService.getPendingReports(limit, offset);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// PATCH /admin/reports/:id - Resolve a report
router.patch(
  '/reports/:id',
  validate(resolveReportSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await moderationService.resolveReport(
        req.params.id,
        req.user!.userId,
        req.body.status,
      );
      res.json(report);
    } catch (error) {
      next(error);
    }
  },
);

// POST /admin/actions - Take a moderation action on a user
router.post(
  '/actions',
  validate(takeActionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const log = await moderationService.takeAction({
        targetId: req.body.targetId,
        moderatorId: req.user!.userId,
        action: req.body.action,
        reason: req.body.reason,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      });
      res.status(201).json(log);
    } catch (error) {
      next(error);
    }
  },
);

// GET /admin/users/:id/history - Get moderation history for a user
router.get('/users/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await moderationService.getModerationHistory(req.params.id);
    res.json({ data: history });
  } catch (error) {
    next(error);
  }
});

// GET /admin/stats - Get moderation dashboard stats
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await moderationService.getModerationStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
