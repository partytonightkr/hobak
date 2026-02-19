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

const updateVetVisitSchema = z.object({
  date: dateString.optional(),
  reason: z.string().min(1).max(500).optional(),
  diagnosis: z.string().max(5000).nullable().optional(),
  treatmentNotes: z.string().max(5000).nullable().optional(),
  cost: z.number().min(0).max(999999.99).nullable().optional(),
});

// PUT /api/v1/dogs/:id/medical/vet-visits/:visitId
export const PUT = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId, visitId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const body = await req.json();
  const data = validateBody(updateVetVisitSchema, body);

  const vetVisit = await medicalService.updateVetVisit(visitId, dogId, data);
  return NextResponse.json(vetVisit);
});

// DELETE /api/v1/dogs/:id/medical/vet-visits/:visitId
export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId, visitId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  await medicalService.deleteVetVisit(visitId, dogId);
  return NextResponse.json({ message: 'Vet visit record deleted successfully' });
});
