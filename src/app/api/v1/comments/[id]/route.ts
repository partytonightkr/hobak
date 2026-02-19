import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import { prisma } from '@/lib/server/db';
import { NotFoundError, ForbiddenError } from '@/lib/server/utils/errors';
import { sanitizeContent } from '@/lib/server/utils/sanitize';

const updateCommentSchema = z.object({
  content: z.string().min(1).max(500),
});

// PATCH /api/v1/comments/:id
export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const user = requireAuth();
  const body = await req.json();
  const data = validateBody(updateCommentSchema, body);

  const comment = await prisma.comment.findUnique({
    where: { id, deletedAt: null },
    select: { authorId: true },
  });

  if (!comment) throw new NotFoundError('Comment');
  if (comment.authorId !== user.userId && user.role !== 'ADMIN') {
    throw new ForbiddenError();
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: { content: sanitizeContent(data.content) },
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

  return NextResponse.json(updated);
});

// DELETE /api/v1/comments/:id (soft delete)
export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const user = requireAuth();

  const comment = await prisma.comment.findUnique({
    where: { id, deletedAt: null },
    select: { authorId: true, postId: true },
  });

  if (!comment) throw new NotFoundError('Comment');
  if (comment.authorId !== user.userId && user.role !== 'ADMIN') {
    throw new ForbiddenError();
  }

  await prisma.$transaction([
    prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
    prisma.post.update({
      where: { id: comment.postId },
      data: { commentsCount: { decrement: 1 } },
    }),
  ]);

  return NextResponse.json({ message: 'Comment deleted successfully' });
});
