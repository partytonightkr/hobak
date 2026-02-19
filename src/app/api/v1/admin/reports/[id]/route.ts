import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth, requireRole } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as moderationService from '@/lib/server/services/moderation.service';

const resolveReportSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
});

// PATCH /api/v1/admin/reports/:id - Resolve a report (ADMIN/MODERATOR only)
export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const user = requireAuth();
  requireRole(user, 'ADMIN', 'MODERATOR');

  const body = await req.json();
  const { status } = validateBody(resolveReportSchema, body);

  const report = await moderationService.resolveReport(id, user.userId, status);
  return NextResponse.json(report);
});
