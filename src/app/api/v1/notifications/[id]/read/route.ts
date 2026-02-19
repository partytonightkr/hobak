import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { markNotificationRead } from '@/lib/server/services/notification.service';

// PATCH /api/v1/notifications/:id/read
export const PATCH = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const user = requireAuth();
  await markNotificationRead(id, user.userId);
  return NextResponse.json({ message: 'Notification marked as read' });
});
