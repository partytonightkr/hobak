import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { paginationSchema } from '../utils/pagination';
import { createNotification } from '../services/notification.service';
import * as feedService from '../services/feed.service';
import { upload, getFileUrl, validateFileMagicBytes } from '../services/upload.service';
import { uploadLimiter } from '../middleware/rateLimit.middleware';
import { syncPostHashtags, removePostHashtags } from '../services/hashtag.service';

const router = Router();

const createPostSchema = z.object({
  content: z.string().min(1).max(2000),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS_ONLY']).default('PUBLIC'),
  repostOfId: z.string().optional(),
});

const updatePostSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS_ONLY']).optional(),
});

// GET /posts/feed
router.get('/feed', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = paginationSchema.parse(req.query);
    const result = await feedService.getFeed(req.user!.userId, pagination);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /posts/explore
router.get('/explore', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = paginationSchema.parse(req.query);
    const result = await feedService.getExploreFeed(pagination);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /posts
router.post(
  '/',
  authenticate,
  validate(createPostSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content, visibility, repostOfId } = req.body;

      // If reposting, verify original post exists
      if (repostOfId) {
        const original = await prisma.post.findUnique({
          where: { id: repostOfId, deletedAt: null },
        });
        if (!original) throw new NotFoundError('Original post');
      }

      // Create post and increment shares count atomically if reposting
      const txOps: any[] = [
        prisma.post.create({
          data: {
            content,
            visibility,
            authorId: req.user!.userId,
            repostOfId,
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isVerified: true,
              },
            },
            repostOf: {
              select: {
                id: true,
                content: true,
                author: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        }),
      ];
      if (repostOfId) {
        txOps.push(
          prisma.post.update({
            where: { id: repostOfId },
            data: { sharesCount: { increment: 1 } },
          }),
        );
      }
      const [post] = await prisma.$transaction(txOps);

      // Extract and link hashtags (reuses same service as post update)
      await syncPostHashtags(post.id, content);

      // Notify reposted user
      if (repostOfId) {
        const original = await prisma.post.findUnique({
          where: { id: repostOfId },
          select: { authorId: true },
        });
        if (original) {
          await createNotification({
            type: 'REPOST',
            recipientId: original.authorId,
            actorId: req.user!.userId,
            targetId: post.id,
            targetType: 'post',
          });
        }
      }

      // Notify mentioned users
      const mentionRegex = /@(\w+)/g;
      const mentions = [...content.matchAll(mentionRegex)].map((m) => m[1]);
      for (const username of [...new Set(mentions)]) {
        const mentioned = await prisma.user.findUnique({
          where: { username },
          select: { id: true },
        });
        if (mentioned && mentioned.id !== req.user!.userId) {
          await createNotification({
            type: 'MENTION',
            recipientId: mentioned.id,
            actorId: req.user!.userId,
            targetId: post.id,
            targetType: 'post',
          });
        }
      }

      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  },
);

// POST /posts/:id/media - Upload media for a post
router.post(
  '/:id/media',
  authenticate,
  uploadLimiter,
  upload.array('files', 4),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const post = await prisma.post.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { authorId: true, mediaUrls: true },
      });

      if (!post) throw new NotFoundError('Post');
      if (post.authorId !== req.user!.userId) throw new ForbiddenError();

      const files = req.files as Express.Multer.File[];

      // Validate magic bytes for each uploaded file
      for (const file of files) {
        await validateFileMagicBytes(file.path, file.mimetype);
      }

      const newUrls = files.map((f) => getFileUrl(f.filename));

      const updated = await prisma.post.update({
        where: { id: req.params.id },
        data: { mediaUrls: [...post.mediaUrls, ...newUrls] },
        select: { id: true, mediaUrls: true },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// GET /posts/:id
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id, deletedAt: null },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        repostOf: {
          select: {
            id: true,
            content: true,
            mediaUrls: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: { comments: true, likes: true },
        },
      },
    });

    if (!post) throw new NotFoundError('Post');

    // Check if the current user has liked this post
    let isLiked = false;
    let isBookmarked = false;
    if (req.user) {
      const like = await prisma.like.findFirst({
        where: { userId: req.user.userId, postId: post.id },
      });
      isLiked = !!like;

      const bookmark = await prisma.bookmark.findFirst({
        where: { userId: req.user.userId, postId: post.id },
      });
      isBookmarked = !!bookmark;
    }

    res.json({ ...post, isLiked, isBookmarked });
  } catch (error) {
    next(error);
  }
});

// PATCH /posts/:id
router.patch(
  '/:id',
  authenticate,
  validate(updatePostSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const post = await prisma.post.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { authorId: true },
      });

      if (!post) throw new NotFoundError('Post');
      if (post.authorId !== req.user!.userId && req.user!.role !== 'ADMIN') {
        throw new ForbiddenError();
      }

      const updated = await prisma.post.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          isEdited: true,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
      });

      // Re-sync hashtags if content changed
      if (req.body.content) {
        await syncPostHashtags(updated.id, req.body.content);
      }

      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /posts/:id (soft delete)
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id, deletedAt: null },
      select: { authorId: true },
    });

    if (!post) throw new NotFoundError('Post');
    if (post.authorId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError();
    }

    // Clean up hashtag associations
    await removePostHashtags(req.params.id);

    await prisma.post.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /posts/:id/like
router.post('/:id/like', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true, authorId: true },
    });

    if (!post) throw new NotFoundError('Post');

    const existing = await prisma.like.findFirst({
      where: { userId: req.user!.userId, postId: post.id },
    });

    if (existing) {
      // Unlike
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existing.id } }),
        prisma.post.update({
          where: { id: post.id },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      res.json({ liked: false });
    } else {
      // Like
      await prisma.$transaction([
        prisma.like.create({
          data: { userId: req.user!.userId, postId: post.id },
        }),
        prisma.post.update({
          where: { id: post.id },
          data: { likesCount: { increment: 1 } },
        }),
      ]);

      await createNotification({
        type: 'LIKE',
        recipientId: post.authorId,
        actorId: req.user!.userId,
        targetId: post.id,
        targetType: 'post',
      });

      res.json({ liked: true });
    }
  } catch (error) {
    next(error);
  }
});

// POST /posts/:id/bookmark
router.post('/:id/bookmark', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true },
    });

    if (!post) throw new NotFoundError('Post');

    const existing = await prisma.bookmark.findFirst({
      where: { userId: req.user!.userId, postId: post.id },
    });

    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      res.json({ bookmarked: false });
    } else {
      await prisma.bookmark.create({
        data: { userId: req.user!.userId, postId: post.id },
      });
      res.json({ bookmarked: true });
    }
  } catch (error) {
    next(error);
  }
});

// POST /posts/:id/report - Report a post
router.post('/:id/report', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportSchema = z.object({
      reason: z.enum(['SPAM', 'HARASSMENT', 'HATE_SPEECH', 'VIOLENCE', 'NUDITY', 'MISINFORMATION', 'IMPERSONATION', 'OTHER']),
      description: z.string().max(1000).optional(),
    });
    const { reason, description } = reportSchema.parse(req.body);

    const post = await prisma.post.findUnique({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true, authorId: true },
    });

    if (!post) throw new NotFoundError('Post');

    const { createReport } = await import('../services/moderation.service');
    const report = await createReport({
      reporterId: req.user!.userId,
      targetType: 'post',
      targetId: post.id,
      reason,
      description,
    });

    res.status(201).json({ message: 'Report submitted successfully', reportId: report.id });
  } catch (error) {
    next(error);
  }
});

// GET /posts/user/:userId
router.get('/user/:userId', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = paginationSchema.parse(req.query);
    const result = await feedService.getUserPosts(req.params.userId, req.user?.userId, pagination);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
