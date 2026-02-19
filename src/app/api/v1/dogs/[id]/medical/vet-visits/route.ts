import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as medicalService from '@/lib/server/services/medical.service';

const dateString = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date format' },
);

const createVetVisitSchema = z.object({
  date: dateString,
  reason: z.string().min(1).max(500),
  diagnosis: z.string().max(5000).nullable().optional(),
  treatmentNotes: z.string().max(5000).nullable().optional(),
  cost: z.number().min(0).max(999999.99).nullable().optional(),
});

// GET /api/v1/dogs/:id/medical/vet-visits
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const vetVisits = await medicalService.listVetVisits(dogId);
  return NextResponse.json({ data: vetVisits });
});

// POST /api/v1/dogs/:id/medical/vet-visits
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const body = await req.json();
  const data = validateBody(createVetVisitSchema, body);

  const vetVisit = await medicalService.createVetVisit(dogId, data);
  return NextResponse.json(vetVisit, { status: 201 });
});
