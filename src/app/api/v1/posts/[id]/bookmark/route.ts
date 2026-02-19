import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { NotFoundError } from '@/lib/server/utils/errors';

// POST /api/v1/posts/:id/bookmark - Toggle bookmark
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const user = requireAuth();

  const post = await prisma.post.findUnique({
    where: { id, deletedAt: null },
    select: { id: true },
  });

  if (!post) throw new NotFoundError('Post');

  const existing = await prisma.bookmark.findFirst({
    where: { userId: user.userId, postId: post.id },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return NextResponse.json({ bookmarked: false });
  } else {
    await prisma.bookmark.create({
      data: { userId: user.userId, postId: post.id },
    });
    return NextResponse.json({ bookmarked: true });
  }
});
