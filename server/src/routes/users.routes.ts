import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { paginationSchema } from '../utils/pagination';
import { createNotification } from '../services/notification.service';

const router = Router();

/** Resolve a route param that could be either a user ID or a username to a user ID */
async function resolveUserId(idOrUsername: string): Promise<string> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: idOrUsername }, { username: idOrUsername }],
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!user) throw new NotFoundError('User');
  return user.id;
}

const updateUserSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  profile: z
    .object({
      website: z.string().url().max(200).optional().nullable(),
      location: z.string().max(100).optional().nullable(),
      coverImageUrl: z.string().url().optional().nullable(),
      birthday: z.string().datetime().optional().nullable(),
    })
    .optional(),
});

// GET /users/:id - supports lookup by user ID or username
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const identifier = req.params.id;
    // Try finding by ID first, then by username
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ id: identifier }, { username: identifier }],
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isVerified: true,
        followerCount: true,
        followingCount: true,
        createdAt: true,
        profile: {
          select: {
            coverImageUrl: true,
            website: true,
            location: true,
          },
        },
        _count: {
          select: {
            posts: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!user) throw new NotFoundError('User');

    // Check if current user follows this user
    let isFollowing = false;
    if (req.user && req.user.userId !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: req.user.userId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    res.json({ ...user, isFollowing });
  } catch (error) {
    next(error);
  }
});

// PATCH /users/:id
router.patch(
  '/:id',
  authenticate,
  validate(updateUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.userId !== req.params.id && req.user!.role !== 'ADMIN') {
        throw new ForbiddenError('You can only update your own profile');
      }

      const { profile: profileData, ...userData } = req.body;

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: {
          ...userData,
          ...(profileData
            ? {
                profile: {
                  upsert: {
                    create: profileData,
                    update: profileData,
                  },
                },
              }
            : {}),
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          isVerified: true,
          profile: true,
        },
      });

      res.json(user);
    } catch (error) {
      next(error);
    }
  },
);

// GET /users/:id/followers - supports lookup by user ID or username
router.get('/:id/followers', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await resolveUserId(req.params.id);
    const pagination = paginationSchema.parse(req.query);

    const followers = await prisma.follow.findMany({
      where: {
        followingId: userId,
        ...(pagination.cursor ? { id: { lt: pagination.cursor } } : {}),
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            bio: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: pagination.limit + 1,
    });

    const hasMore = followers.length > pagination.limit;
    const data = hasMore ? followers.slice(0, pagination.limit) : followers;

    res.json({
      data: data.map((f) => f.follower),
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
});

// GET /users/:id/following - supports lookup by user ID or username
router.get('/:id/following', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await resolveUserId(req.params.id);
    const pagination = paginationSchema.parse(req.query);

    const following = await prisma.follow.findMany({
      where: {
        followerId: userId,
        ...(pagination.cursor ? { id: { lt: pagination.cursor } } : {}),
      },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            bio: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: pagination.limit + 1,
    });

    const hasMore = following.length > pagination.limit;
    const data = hasMore ? following.slice(0, pagination.limit) : following;

    res.json({
      data: data.map((f) => f.following),
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
});

// POST /users/:id/follow - supports lookup by user ID or username
router.post('/:id/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = await resolveUserId(req.params.id);
    const followerId = req.user!.userId;

    if (targetId === followerId) {
      throw new ConflictError('You cannot follow yourself');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetId, deletedAt: null },
      select: { id: true },
    });
    if (!targetUser) throw new NotFoundError('User');

    // Check if blocked
    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: targetId, blockedId: followerId },
          { blockerId: followerId, blockedId: targetId },
        ],
      },
    });
    if (blocked) throw new ForbiddenError('Cannot follow this user');

    const existingFollow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: targetId } },
    });

    if (existingFollow) {
      throw new ConflictError('Already following this user');
    }

    // Create follow and atomically update follower/following counts
    await prisma.$transaction([
      prisma.follow.create({
        data: { followerId, followingId: targetId },
      }),
      prisma.user.update({
        where: { id: targetId },
        data: { followerCount: { increment: 1 } },
      }),
      prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      }),
    ]);

    await createNotification({
      type: 'FOLLOW',
      recipientId: targetId,
      actorId: followerId,
      targetId: followerId,
      targetType: 'user',
    });

    res.status(201).json({ following: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /users/:id/follow - supports lookup by user ID or username
router.delete('/:id/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = await resolveUserId(req.params.id);
    const followerId = req.user!.userId;

    // Check if follow exists before deleting
    const existingFollow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: targetId } },
    });

    if (!existingFollow) {
      res.json({ message: 'Not following this user' });
      return;
    }

    // Delete follow and atomically update follower/following counts
    await prisma.$transaction([
      prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId: targetId } },
      }),
      prisma.user.update({
        where: { id: targetId },
        data: { followerCount: { decrement: 1 } },
      }),
      prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { decrement: 1 } },
      }),
    ]);

    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
