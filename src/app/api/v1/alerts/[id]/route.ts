import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import * as locationService from '@/lib/server/services/location.service';

// GET /api/v1/alerts/:id - Get alert details with dog info
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  requireAuth();

  const alert = await locationService.getAlertById(id);
  return NextResponse.json(alert);
});
