import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth, getAuthPayload } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import { prisma } from '@/lib/server/db';
import { NotFoundError, ForbiddenError } from '@/lib/server/utils/errors';
import { sanitizeContent } from '@/lib/server/utils/sanitize';
import { syncPostHashtags, removePostHashtags } from '@/lib/server/services/hashtag.service';

const updatePostSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS_ONLY']).optional(),
});

// GET /api/v1/posts/:id
export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const viewer = getAuthPayload();

  const post = await prisma.post.findUnique({
    where: { id, deletedAt: null },
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

  // Check if the current user has liked/bookmarked this post
  let isLiked = false;
  let isBookmarked = false;
  if (viewer) {
    const like = await prisma.like.findFirst({
      where: { userId: viewer.userId, postId: post.id },
    });
    isLiked = !!like;

    const bookmark = await prisma.bookmark.findFirst({
      where: { userId: viewer.userId, postId: post.id },
    });
    isBookmarked = !!bookmark;
  }

  return NextResponse.json({ ...post, isLiked, isBookmarked });
});

// PATCH /api/v1/posts/:id
export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const user = requireAuth();
  const body = await req.json();
  const data = validateBody(updatePostSchema, body);

  const post = await prisma.post.findUnique({
    where: { id, deletedAt: null },
    select: { authorId: true },
  });

  if (!post) throw new NotFoundError('Post');
  if (post.authorId !== user.userId && user.role !== 'ADMIN') {
    throw new ForbiddenError();
  }

  // Sanitize content if provided
  const updateData: Record<string, unknown> = { ...data, isEdited: true };
  if (data.content) {
    updateData.content = sanitizeContent(data.content);
  }

  const updated = await prisma.post.update({
    where: { id },
    data: updateData,
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
  if (data.content) {
    await syncPostHashtags(updated.id, updateData.content as string);
  }

  return NextResponse.json(updated);
});

// DELETE /api/v1/posts/:id (soft delete)
export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const user = requireAuth();

  const post = await prisma.post.findUnique({
    where: { id, deletedAt: null },
    select: { authorId: true },
  });

  if (!post) throw new NotFoundError('Post');
  if (post.authorId !== user.userId && user.role !== 'ADMIN') {
    throw new ForbiddenError();
  }

  // Clean up hashtag associations
  await removePostHashtags(id);

  await prisma.post.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ message: 'Post deleted successfully' });
});
