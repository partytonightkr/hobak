import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth, requireRole } from '@/lib/server/auth';
import * as moderationService from '@/lib/server/services/moderation.service';

// GET /api/v1/admin/stats - Get moderation dashboard stats (ADMIN/MODERATOR only)
export const GET = apiHandler(async (_req: NextRequest) => {
  const user = requireAuth();
  requireRole(user, 'ADMIN', 'MODERATOR');

  const stats = await moderationService.getModerationStats();
  return NextResponse.json(stats);
});
