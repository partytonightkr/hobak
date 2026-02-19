import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { prisma } from '@/lib/server/db';
import { NotFoundError } from '@/lib/server/utils/errors';
import { paginationSchema } from '@/lib/server/utils/pagination';

async function resolveUserId(idOrUsername: string): Promise<string> {
  const user = await prisma.user.findFirst({
    where: { OR: [{ id: idOrUsername }, { username: idOrUsername }], deletedAt: null },
    select: { id: true },
  });
  if (!user) throw new NotFoundError('User');
  return user.id;
}

// GET /api/v1/users/[id]/following - Get users this user is following (paginated)
export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const resolvedUserId = await resolveUserId(id);

  const { cursor, limit } = paginationSchema.parse(
    Object.fromEntries(req.nextUrl.searchParams),
  );

  const follows = await prisma.follow.findMany({
    where: {
      followerId: resolvedUserId,
      followerDogId: null, // Only user-to-user follows
      followingDogId: null,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    include: {
      following: {
        select: {
          id: true,
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          isVerified: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = follows.length > limit;
  const data = hasMore ? follows.slice(0, limit) : follows;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return NextResponse.json({
    data: data.map((f) => f.following),
    nextCursor,
    hasMore,
  });
});
