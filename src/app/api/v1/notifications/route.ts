import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { getNotifications } from '@/lib/server/services/notification.service';

// GET /api/v1/notifications - List notifications, paginated
export const GET = apiHandler(async (req: NextRequest) => {
  const user = requireAuth();

  const cursor = req.nextUrl.searchParams.get('cursor') ?? undefined;
  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get('limit') || '20', 10), 1),
    100,
  );

  const result = await getNotifications(user.userId, cursor, limit);
  return NextResponse.json(result);
});
