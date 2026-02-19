import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { prisma } from '@/lib/server/db';

/** Escape SQL LIKE wildcard characters to prevent injection via Prisma ILIKE queries */
function escapeLikeWildcards(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

// GET /api/v1/search - User search (optionalAuth - no requireAuth)
export const GET = apiHandler(async (req: NextRequest) => {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (!q || q.length > 200) {
    return NextResponse.json({ users: [] });
  }

  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get('limit') || '20', 10), 1),
    100,
  );

  const safeQ = escapeLikeWildcards(q);

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { username: { contains: safeQ, mode: 'insensitive' } },
        { displayName: { contains: safeQ, mode: 'insensitive' } },
      ],
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

  return NextResponse.json({ users });
});
