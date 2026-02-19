import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth, requireRole } from '@/lib/server/auth';
import * as moderationService from '@/lib/server/services/moderation.service';

// GET /api/v1/admin/reports - Get pending reports (ADMIN/MODERATOR only)
export const GET = apiHandler(async (req: NextRequest) => {
  const user = requireAuth();
  requireRole(user, 'ADMIN', 'MODERATOR');

  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get('limit') || '20', 10), 1),
    100,
  );
  const offset = Math.max(parseInt(req.nextUrl.searchParams.get('offset') || '0', 10), 0);

  const result = await moderationService.getPendingReports(limit, offset);
  return NextResponse.json(result);
});
