import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import * as locationService from '@/lib/server/services/location.service';

// GET /api/v1/parks/:id/check-ins - List active check-ins at a park
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: parkId } = await params;
  requireAuth();

  const checkIns = await locationService.getActiveCheckIns(parkId);
  return NextResponse.json({ data: checkIns });
});
