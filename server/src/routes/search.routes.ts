import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { paginationSchema } from '../utils/pagination';

const router = Router();

/** Escape SQL LIKE wildcard characters to prevent injection via Prisma ILIKE queries */
function escapeLikeWildcards(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

const searchSchema = z.object({
  q: z.string().min(1).max(200),
  ...paginationSchema.shape,
});

// GET /search - User search (MVP: user search only, post/hashtag search deferred to v1.1)
router.get(
  '/',
  optionalAuth,
  validate(searchSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, limit } = req.query as unknown as z.infer<typeof searchSchema>;
      const safeQ = escapeLikeWildcards(q);

      const users = await prisma.user.findMany({
        where: {
          deletedAt: null,
          OR: [
            { username: { contains: safeQ, mode: 'insensitive' } },
            { displayName: { contains: safeQ, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          isVerified: true,
          followerCount: true,
        },
        orderBy: [
          { isVerified: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });

      res.json({ users });
    } catch (error) {
      next(error);
    }
  },
);

// GET /search/autocomplete?q= - Fast user autocomplete for search bar
router.get(
  '/autocomplete',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string || '').trim();
      if (q.length < 2) {
        res.json({ users: [] });
        return;
      }
      const safeQ = escapeLikeWildcards(q);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 5, 1), 10);

      const users = await prisma.user.findMany({
        where: {
          deletedAt: null,
          OR: [
            { username: { startsWith: safeQ, mode: 'insensitive' } },
            { displayName: { startsWith: safeQ, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
        },
        orderBy: { isVerified: 'desc' },
        take: limit,
      });

      res.json({ users });
    } catch (error) {
      next(error);
    }
  },
);

// GET /search/suggestions - User suggestions (MVP: recent signups + verified users, not algorithmic)
router.get(
  '/suggestions',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 50);

      // MVP: Return recent signups and verified users (staff picks)
      // Exclude users the current user already follows
      let excludeIds: string[] = [];
      if (req.user) {
        const following = await prisma.follow.findMany({
          where: { followerId: req.user.userId },
          select: { followingId: true },
        });
        excludeIds = [req.user.userId, ...following.map((f) => f.followingId)];
      }

      const users = await prisma.user.findMany({
        where: {
          deletedAt: null,
          ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          isVerified: true,
          followerCount: true,
        },
        orderBy: [
          { isVerified: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });

      res.json({ data: users });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
