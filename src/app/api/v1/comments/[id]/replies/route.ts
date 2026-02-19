import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { validateQuery } from '@/lib/server/validation';
import { prisma } from '@/lib/server/db';
import { paginationSchema } from '@/lib/server/utils/pagination';

// GET /api/v1/comments/:id/replies - Get replies to a comment
export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const pagination = validateQuery(paginationSchema, req.nextUrl.searchParams);

  const replies = await prisma.comment.findMany({
    where: {
      parentId: id,
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
    orderBy: { createdAt: 'asc' },
    take: pagination.limit + 1,
  });

  const hasMore = replies.length > pagination.limit;
  const data = hasMore ? replies.slice(0, pagination.limit) : replies;

  return NextResponse.json({
    data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  });
});
