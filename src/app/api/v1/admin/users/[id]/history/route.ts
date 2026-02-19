import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth, requireRole } from '@/lib/server/auth';
import * as moderationService from '@/lib/server/services/moderation.service';

// GET /api/v1/admin/users/:id/history - Get moderation history for a user (ADMIN/MODERATOR only)
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const user = requireAuth();
  requireRole(user, 'ADMIN', 'MODERATOR');

  const history = await moderationService.getModerationHistory(id);
  return NextResponse.json({ data: history });
});
