import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { prisma } from '@/lib/server/db';
import { NotFoundError } from '@/lib/server/utils/errors';
import { paginationSchema } from '@/lib/server/utils/pagination';

async function resolveDogId(idOrUsername: string): Promise<string> {
  const dog = await prisma.dog.findFirst({
    where: { OR: [{ id: idOrUsername }, { username: idOrUsername }], deletedAt: null },
    select: { id: true },
  });
  if (!dog) throw new NotFoundError('Dog');
  return dog.id;
}

// GET /api/v1/dogs/[id]/followers - Get dog's followers (paginated)
export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const resolvedDogId = await resolveDogId(id);

  const { cursor, limit } = paginationSchema.parse(
    Object.fromEntries(req.nextUrl.searchParams),
  );

  const follows = await prisma.follow.findMany({
    where: {
      followingDogId: resolvedDogId,
      ...(cursor ? { id: { lt: cursor } } : {}),
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
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
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
    data: data.map((f) => f.followerDog).filter(Boolean),
    nextCursor,
    hasMore,
  });
});
