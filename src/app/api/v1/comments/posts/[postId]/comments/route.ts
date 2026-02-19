import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth, getAuthPayload } from '@/lib/server/auth';
import { validateBody, validateQuery } from '@/lib/server/validation';
import { prisma } from '@/lib/server/db';
import { NotFoundError } from '@/lib/server/utils/errors';
import { paginationSchema } from '@/lib/server/utils/pagination';
import { sanitizeContent } from '@/lib/server/utils/sanitize';
import { createNotification } from '@/lib/server/services/notification.service';

const createCommentSchema = z.object({
  content: z.string().min(1).max(500),
  parentId: z.string().optional(),
});

// GET /api/v1/comments/posts/:postId/comments - Get top-level comments for a post
export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { postId } = await params;
  const pagination = validateQuery(paginationSchema, req.nextUrl.searchParams);

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

  return NextResponse.json({
    data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  });
});

// POST /api/v1/comments/posts/:postId/comments - Create a comment
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { postId } = await params;
  const user = requireAuth();
  const body = await req.json();
  const { content: rawContent, parentId } = validateBody(createCommentSchema, body);

  const content = sanitizeContent(rawContent);

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
      actorId: user.userId,
      targetId: parentId,
      targetType: 'comment',
    });
  }

  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: {
        content,
        authorId: user.userId,
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

  // Notify post author (only for top-level comments, not replies)
  if (!parentId) {
    await createNotification({
      type: 'COMMENT',
      recipientId: post.authorId,
      actorId: user.userId,
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
    if (mentioned && mentioned.id !== user.userId) {
      await createNotification({
        type: 'MENTION',
        recipientId: mentioned.id,
        actorId: user.userId,
        targetId: comment.id,
        targetType: 'comment',
      });
    }
  }

  return NextResponse.json(comment, { status: 201 });
});
