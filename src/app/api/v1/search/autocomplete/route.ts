import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { prisma } from '@/lib/server/db';

/** Escape SQL LIKE wildcard characters to prevent injection via Prisma ILIKE queries */
function escapeLikeWildcards(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

// GET /api/v1/search/autocomplete - Fast user autocomplete for search bar
export const GET = apiHandler(async (req: NextRequest) => {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const safeQ = escapeLikeWildcards(q);
  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get('limit') || '5', 10), 1),
    10,
  );

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { username: { startsWith: safeQ, mode: 'insensitive' } },
        { displayName: { startsWith: safeQ, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isVerified: true,
    },
    orderBy: { isVerified: 'desc' },
    take: limit,
  });

  return NextResponse.json({ users });
});
