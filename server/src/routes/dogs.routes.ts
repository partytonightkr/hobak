import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { paginationSchema, buildPaginatedResponse } from '../utils/pagination';

const router = Router();

// ── Zod schemas ──────────────────────────────

const createDogSchema = z.object({
  name: z.string().min(1).max(100),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric with underscores only'),
  breed: z.string().min(1).max(100),
  dateOfBirth: z.string().optional(),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']).optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(),
  personalityTraits: z.array(z.string()).min(1).max(10).optional(),
  temperamentNotes: z.string().max(1000).optional(),
});

const updateDogSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  breed: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().optional().nullable(),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']).optional().nullable(),
  bio: z.string().max(280).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  coverUrl: z.string().url().optional().nullable(),
  personalityTraits: z.array(z.string()).min(1).max(10).optional(),
  temperamentNotes: z.string().max(1000).optional().nullable(),
});

// ── Helpers ──────────────────────────────────

async function resolveDogId(idOrUsername: string): Promise<string> {
  const dog = await prisma.dog.findFirst({
    where: {
      OR: [{ id: idOrUsername }, { username: idOrUsername }],
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!dog) throw new NotFoundError('Dog');
  return dog.id;
}

// ── Routes ───────────────────────────────────

// POST /dogs - Create a dog profile
router.post(
  '/',
  authenticate,
  validate(createDogSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { username, dateOfBirth, ...rest } = req.body;

      // Check username uniqueness (across dogs and users)
      const [existingDog, existingUser] = await Promise.all([
        prisma.dog.findUnique({ where: { username } }),
        prisma.user.findUnique({ where: { username } }),
      ]);
      if (existingDog || existingUser) {
        throw new ConflictError('Username is already taken');
      }

      const dog = await prisma.dog.create({
        data: {
          ...rest,
          username,
          ownerId: userId,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        },
      });

      // Update user's hasDogs flag and set as primary if first dog
      const dogCount = await prisma.dog.count({ where: { ownerId: userId, deletedAt: null } });
      await prisma.user.update({
        where: { id: userId },
        data: {
          hasDogs: true,
          ...(dogCount === 1 ? { primaryDogId: dog.id } : {}),
        },
      });

      res.status(201).json(dog);
    } catch (error) {
      next(error);
    }
  },
);

// GET /dogs/me - List current user's dogs
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dogs = await prisma.dog.findMany({
      where: { ownerId: req.user!.userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ data: dogs });
  } catch (error) {
    next(error);
  }
});

// GET /dogs/:id - Get a dog profile (by ID or username)
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const identifier = req.params.id;
    const dog = await prisma.dog.findFirst({
      where: {
        OR: [{ id: identifier }, { username: identifier }],
        deletedAt: null,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            posts: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!dog) throw new NotFoundError('Dog');

    // Check if requesting user's primary dog follows this dog
    let isFollowing = false;
    if (req.user) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { primaryDogId: true },
      });
      if (user?.primaryDogId && user.primaryDogId !== dog.id) {
        const follow = await prisma.follow.findFirst({
          where: { followerDogId: user.primaryDogId, followingDogId: dog.id },
        });
        isFollowing = !!follow;
      }
    }

    res.json({ ...dog, isFollowing });
  } catch (error) {
    next(error);
  }
});

// PATCH /dogs/:id - Update a dog profile
router.patch(
  '/:id',
  authenticate,
  validate(updateDogSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dogId = await resolveDogId(req.params.id);
      const dog = await prisma.dog.findUnique({ where: { id: dogId }, select: { ownerId: true } });
      if (!dog) throw new NotFoundError('Dog');
      if (dog.ownerId !== req.user!.userId) {
        throw new ForbiddenError('You can only update your own dogs');
      }

      const { dateOfBirth, ...rest } = req.body;
      const updated = await prisma.dog.update({
        where: { id: dogId },
        data: {
          ...rest,
          ...(dateOfBirth !== undefined
            ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
            : {}),
        },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /dogs/:id - Soft-delete a dog profile
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dogId = await resolveDogId(req.params.id);
    const dog = await prisma.dog.findUnique({ where: { id: dogId }, select: { ownerId: true } });
    if (!dog) throw new NotFoundError('Dog');
    if (dog.ownerId !== req.user!.userId) {
      throw new ForbiddenError('You can only delete your own dogs');
    }

    await prisma.dog.update({
      where: { id: dogId },
      data: { deletedAt: new Date() },
    });

    // If this was the primary dog, clear it
    await prisma.user.updateMany({
      where: { primaryDogId: dogId },
      data: { primaryDogId: null },
    });

    // Check if user still has dogs
    const remaining = await prisma.dog.count({
      where: { ownerId: req.user!.userId, deletedAt: null },
    });
    if (remaining === 0) {
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { hasDogs: false },
      });
    }

    res.json({ message: 'Dog profile deleted' });
  } catch (error) {
    next(error);
  }
});

// POST /dogs/:id/follow - Follow a dog (dog-to-dog)
router.post('/:id/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetDogId = await resolveDogId(req.params.id);
    const userId = req.user!.userId;

    // Get user's primary dog
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { primaryDogId: true },
    });
    if (!user?.primaryDogId) {
      throw new ForbiddenError('You need a dog profile to follow other dogs');
    }
    const followerDogId = user.primaryDogId;

    if (targetDogId === followerDogId) {
      throw new ConflictError('A dog cannot follow itself');
    }

    // Get the target dog's owner for the follow record
    const targetDog = await prisma.dog.findUnique({
      where: { id: targetDogId },
      select: { ownerId: true },
    });
    if (!targetDog) throw new NotFoundError('Dog');

    // Get follower dog's owner
    const followerDog = await prisma.dog.findUnique({
      where: { id: followerDogId },
      select: { ownerId: true },
    });
    if (!followerDog) throw new NotFoundError('Dog');

    // Check for existing follow
    const existing = await prisma.follow.findFirst({
      where: { followerDogId, followingDogId: targetDogId },
    });
    if (existing) {
      throw new ConflictError('Already following this dog');
    }

    // Create follow with both user and dog references
    await prisma.$transaction([
      prisma.follow.create({
        data: {
          followerId: followerDog.ownerId,
          followingId: targetDog.ownerId,
          followerDogId,
          followingDogId: targetDogId,
        },
      }),
      prisma.dog.update({
        where: { id: targetDogId },
        data: { followerCount: { increment: 1 } },
      }),
      prisma.dog.update({
        where: { id: followerDogId },
        data: { followingCount: { increment: 1 } },
      }),
    ]);

    res.status(201).json({ following: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /dogs/:id/follow - Unfollow a dog
router.delete('/:id/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetDogId = await resolveDogId(req.params.id);
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { primaryDogId: true },
    });
    if (!user?.primaryDogId) {
      res.json({ message: 'Not following this dog' });
      return;
    }

    const follow = await prisma.follow.findFirst({
      where: { followerDogId: user.primaryDogId, followingDogId: targetDogId },
    });
    if (!follow) {
      res.json({ message: 'Not following this dog' });
      return;
    }

    await prisma.$transaction([
      prisma.follow.delete({ where: { id: follow.id } }),
      prisma.dog.update({
        where: { id: targetDogId },
        data: { followerCount: { decrement: 1 } },
      }),
      prisma.dog.update({
        where: { id: user.primaryDogId },
        data: { followingCount: { decrement: 1 } },
      }),
    ]);

    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /dogs/:id/followers - List a dog's followers
router.get('/:id/followers', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dogId = await resolveDogId(req.params.id);
    const pagination = paginationSchema.parse(req.query);

    const followers = await prisma.follow.findMany({
      where: {
        followingDogId: dogId,
        ...(pagination.cursor ? { id: { lt: pagination.cursor } } : {}),
      },
      include: {
        followerDog: {
          select: {
            id: true,
            name: true,
            username: true,
            breed: true,
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
      data: data.map((f) => f.followerDog).filter(Boolean),
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
});

// GET /dogs/:id/following - List dogs a dog follows
router.get('/:id/following', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dogId = await resolveDogId(req.params.id);
    const pagination = paginationSchema.parse(req.query);

    const following = await prisma.follow.findMany({
      where: {
        followerDogId: dogId,
        ...(pagination.cursor ? { id: { lt: pagination.cursor } } : {}),
      },
      include: {
        followingDog: {
          select: {
            id: true,
            name: true,
            username: true,
            breed: true,
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
      data: data.map((f) => f.followingDog).filter(Boolean),
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /dogs/:id/set-primary - Set a dog as the user's primary dog
router.patch('/:id/set-primary', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dogId = await resolveDogId(req.params.id);
    const dog = await prisma.dog.findUnique({ where: { id: dogId }, select: { ownerId: true } });
    if (!dog) throw new NotFoundError('Dog');
    if (dog.ownerId !== req.user!.userId) {
      throw new ForbiddenError('You can only set your own dogs as primary');
    }

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { primaryDogId: dogId },
    });

    res.json({ message: 'Primary dog updated', primaryDogId: dogId });
  } catch (error) {
    next(error);
  }
});

export default router;
