import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as locationService from '@/lib/server/services/location.service';

const createAlertSchema = z.object({
  dogId: z.string().min(1),
  lastSeenLatitude: z.number().min(-90).max(90),
  lastSeenLongitude: z.number().min(-180).max(180),
  lastSeenAt: z.coerce.date(),
  description: z.string().min(1).max(5000),
});

// GET /api/v1/alerts - List active alerts near a location
export const GET = apiHandler(async (req: NextRequest) => {
  requireAuth();

  const lat = parseFloat(req.nextUrl.searchParams.get('lat') || '');
  const lng = parseFloat(req.nextUrl.searchParams.get('lng') || '');
  const radiusKm = parseFloat(req.nextUrl.searchParams.get('radiusKm') || '10');

  const nearbyQuerySchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusKm: z.number().min(0.1).max(100),
  });

  const parsed = nearbyQuerySchema.parse({ lat, lng, radiusKm });
  const alerts = await locationService.findNearbyAlerts(parsed.lat, parsed.lng, parsed.radiusKm);
  return NextResponse.json({ data: alerts });
});

// POST /api/v1/alerts - Create a lost dog alert
export const POST = apiHandler(async (req: NextRequest) => {
  const user = requireAuth();

  const body = await req.json();
  const data = validateBody(createAlertSchema, body);

  const alert = await locationService.createLostDogAlert({
    ...data,
    userId: user.userId,
  });

  return NextResponse.json(alert, { status: 201 });
});
