import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { NotFoundError } from '@/lib/server/utils/errors';
import { createNotification } from '@/lib/server/services/notification.service';

// POST /api/v1/posts/:id/like - Toggle like
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const user = requireAuth();

  const post = await prisma.post.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, authorId: true },
  });

  if (!post) throw new NotFoundError('Post');

  const existing = await prisma.like.findFirst({
    where: { userId: user.userId, postId: post.id },
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
    return NextResponse.json({ liked: false });
  } else {
    // Like
    await prisma.$transaction([
      prisma.like.create({
        data: { userId: user.userId, postId: post.id },
      }),
      prisma.post.update({
        where: { id: post.id },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    await createNotification({
      type: 'LIKE',
      recipientId: post.authorId,
      actorId: user.userId,
      targetId: post.id,
      targetType: 'post',
    });

    return NextResponse.json({ liked: true });
  }
});
