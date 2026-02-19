import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import * as locationService from '@/lib/server/services/location.service';

// GET /api/v1/alerts/my - List alerts for the current user's dogs
export const GET = apiHandler(async (_req: NextRequest) => {
  const user = requireAuth();
  const alerts = await locationService.getMyAlerts(user.userId);
  return NextResponse.json({ data: alerts });
});
