import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as locationService from '@/lib/server/services/location.service';

const checkInSchema = z.object({
  dogId: z.string().min(1),
});

// POST /api/v1/parks/:id/check-in - Check in a dog at a park
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: parkId } = await params;
  const user = requireAuth();

  const body = await req.json();
  const { dogId } = validateBody(checkInSchema, body);

  const checkIn = await locationService.checkIn(dogId, parkId, user.userId);
  return NextResponse.json(checkIn, { status: 201 });
});
