import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { getAuthPayload } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';

// GET /api/v1/search/suggestions - User suggestions (optionalAuth)
// MVP: Return recent signups and verified users (staff picks)
export const GET = apiHandler(async (req: NextRequest) => {
  const viewer = getAuthPayload();
  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get('limit') || '20', 10), 1),
    50,
  );

  // Exclude users the current user already follows
  let excludeIds: string[] = [];
  if (viewer) {
    const following = await prisma.follow.findMany({
      where: { followerId: viewer.userId },
      select: { followingId: true },
    });
    excludeIds = [viewer.userId, ...following.map((f) => f.followingId)];
  }

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      isVerified: true,
      followerCount: true,
    },
    orderBy: [
      { isVerified: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
  });

  return NextResponse.json({ data: users });
});
