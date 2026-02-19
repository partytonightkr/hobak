import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { NotFoundError } from '@/lib/server/utils/errors';
import * as analyticsService from '@/lib/server/services/analytics.service';

// GET /api/v1/analytics/posts/:id - Get analytics for a specific post
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const user = requireAuth();

  const analytics = await analyticsService.getPostAnalytics(id, user.userId);
  if (!analytics) {
    throw new NotFoundError('Post');
  }

  return NextResponse.json(analytics);
});
