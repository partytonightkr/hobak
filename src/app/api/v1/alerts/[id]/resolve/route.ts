import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as locationService from '@/lib/server/services/location.service';

const resolveAlertSchema = z.object({
  status: z.enum(['FOUND', 'CANCELLED']),
});

// PATCH /api/v1/alerts/:id/resolve - Mark alert as found or cancelled
export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const user = requireAuth();

  const body = await req.json();
  const { status } = validateBody(resolveAlertSchema, body);

  const alert = await locationService.resolveAlert(id, status, user.userId);
  return NextResponse.json(alert);
});
