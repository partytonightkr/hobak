import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { getUnreadCount } from '@/lib/server/services/notification.service';

// GET /api/v1/notifications/unread-count
export const GET = apiHandler(async (_req: NextRequest) => {
  const user = requireAuth();
  const count = await getUnreadCount(user.userId);
  return NextResponse.json({ count });
});
