import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { paginationSchema } from '../utils/pagination';
import { createNotification } from '../services/notification.service';

const router = Router();

const createCommentSchema = z.object({
  content: z.string().min(1).max(500),
  parentId: z.string().optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(500),
});

// GET /posts/:postId/comments
router.get(
  '/posts/:postId/comments',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = paginationSchema.parse(req.query);
      const postId = req.params.postId;

      const post = await prisma.post.findUnique({
        where: { id: postId, deletedAt: null },
        select: { id: true },
      });
      if (!post) throw new NotFoundError('Post');

      const comments = await prisma.comment.findMany({
        where: {
          postId,
          parentId: null, // Only top-level comments
          deletedAt: null,
          ...(pagination.cursor
            ? {
                createdAt: {
                  lt: (
                    await prisma.comment.findUnique({
                      where: { id: pagination.cursor },
                      select: { createdAt: true },
                    })
                  )?.createdAt,
                },
              }
            : {}),
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
          _count: {
            select: { replies: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: pagination.limit + 1,
      });

      const hasMore = comments.length > pagination.limit;
      const data = hasMore ? comments.slice(0, pagination.limit) : comments;

      res.json({
        data,
        nextCursor: hasMore ? data[data.length - 1].id : null,
        hasMore,
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /comments/:id/replies
router.get(
  '/:id/replies',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = paginationSchema.parse(req.query);

      const replies = await prisma.comment.findMany({
        where: {
          parentId: req.params.id,
          deletedAt: null,
          ...(pagination.cursor
            ? {
                createdAt: {
                  lt: (
                    await prisma.comment.findUnique({
                      where: { id: pagination.cursor },
                      select: { createdAt: true },
                    })
                  )?.createdAt,
                },
              }
            : {}),
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
          _count: {
            select: { replies: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: pagination.limit + 1,
      });

      const hasMore = replies.length > pagination.limit;
      const data = hasMore ? replies.slice(0, pagination.limit) : replies;

      res.json({
        data,
        nextCursor: hasMore ? data[data.length - 1].id : null,
        hasMore,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /posts/:postId/comments
router.post(
  '/posts/:postId/comments',
  authenticate,
  validate(createCommentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const postId = req.params.postId;
      const { content, parentId } = req.body;

      const post = await prisma.post.findUnique({
        where: { id: postId, deletedAt: null },
        select: { id: true, authorId: true },
      });
      if (!post) throw new NotFoundError('Post');

      // Verify parent comment exists if replying
      if (parentId) {
        const parent = await prisma.comment.findUnique({
          where: { id: parentId, postId, deletedAt: null },
          select: { id: true, authorId: true },
        });
        if (!parent) throw new NotFoundError('Parent comment');

        // Notify parent comment author
        await createNotification({
          type: 'REPLY',
          recipientId: parent.authorId,
          actorId: req.user!.userId,
          targetId: parentId,
          targetType: 'comment',
        });
      }

      const [comment] = await prisma.$transaction([
        prisma.comment.create({
          data: {
            content,
            authorId: req.user!.userId,
            postId,
            parentId,
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
        }),
        prisma.post.update({
          where: { id: postId },
          data: { commentsCount: { increment: 1 } },
        }),
      ]);

      // Notify post author
      if (!parentId) {
        await createNotification({
          type: 'COMMENT',
          recipientId: post.authorId,
          actorId: req.user!.userId,
          targetId: post.id,
          targetType: 'post',
        });
      }

      // Notify mentioned users
      const mentionRegex = /@(\w+)/g;
      const mentions = [...content.matchAll(mentionRegex)].map((m: RegExpMatchArray) => m[1]);
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
            targetId: comment.id,
            targetType: 'comment',
          });
        }
      }

      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /comments/:id
router.patch(
  '/:id',
  authenticate,
  validate(updateCommentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comment = await prisma.comment.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { authorId: true },
      });

      if (!comment) throw new NotFoundError('Comment');
      if (comment.authorId !== req.user!.userId && req.user!.role !== 'ADMIN') {
        throw new ForbiddenError();
      }

      const updated = await prisma.comment.update({
        where: { id: req.params.id },
        data: { content: req.body.content },
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

      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /comments/:id (soft delete)
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id, deletedAt: null },
      select: { authorId: true, postId: true },
    });

    if (!comment) throw new NotFoundError('Comment');
    if (comment.authorId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError();
    }

    await prisma.$transaction([
      prisma.comment.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date() },
      }),
      prisma.post.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: 1 } },
      }),
    ]);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
