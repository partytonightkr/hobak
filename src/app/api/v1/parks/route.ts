import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as locationService from '@/lib/server/services/location.service';

const createParkSchema = z.object({
  name: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(500).optional(),
});

// GET /api/v1/parks - List parks near a location
export const GET = apiHandler(async (req: NextRequest) => {
  requireAuth();

  const lat = parseFloat(req.nextUrl.searchParams.get('lat') || '');
  const lng = parseFloat(req.nextUrl.searchParams.get('lng') || '');
  const radiusKm = parseFloat(req.nextUrl.searchParams.get('radiusKm') || '10');

  // Validate query params
  const nearbyQuerySchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusKm: z.number().min(0.1).max(100),
  });

  const parsed = nearbyQuerySchema.parse({ lat, lng, radiusKm });
  const parks = await locationService.findNearbyParks(parsed.lat, parsed.lng, parsed.radiusKm);
  return NextResponse.json({ data: parks });
});

// POST /api/v1/parks - Submit a new park
export const POST = apiHandler(async (req: NextRequest) => {
  const user = requireAuth();

  const body = await req.json();
  const data = validateBody(createParkSchema, body);

  const park = await locationService.createPark({
    ...data,
    submittedByUserId: user.userId,
  });

  return NextResponse.json(park, { status: 201 });
});
