import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import * as analyticsService from '@/lib/server/services/analytics.service';

// GET /api/v1/analytics/profile - Get profile analytics for the authenticated user
export const GET = apiHandler(async (req: NextRequest) => {
  const user = requireAuth();
  const days = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get('days') || '30', 10), 1),
    365,
  );

  const analytics = await analyticsService.getProfileAnalytics(user.userId, days);
  return NextResponse.json(analytics);
});
