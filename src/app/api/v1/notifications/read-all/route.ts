import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { markAllNotificationsRead } from '@/lib/server/services/notification.service';

// POST /api/v1/notifications/read-all
export const POST = apiHandler(async (_req: NextRequest) => {
  const user = requireAuth();
  await markAllNotificationsRead(user.userId);
  return NextResponse.json({ message: 'All notifications marked as read' });
});
