import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import * as locationService from '@/lib/server/services/location.service';

// GET /api/v1/parks/:id - Get park details with active check-ins
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  requireAuth();

  const park = await locationService.getParkWithCheckIns(id);
  return NextResponse.json(park);
});
