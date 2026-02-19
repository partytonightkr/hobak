import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as medicalService from '@/lib/server/services/medical.service';

const updateAllergySchema = z.object({
  allergen: z.string().min(1).max(200).optional(),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE']).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// PUT /api/v1/dogs/:id/medical/allergies/:allergyId
export const PUT = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId, allergyId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const body = await req.json();
  const data = validateBody(updateAllergySchema, body);

  const allergy = await medicalService.updateAllergy(allergyId, dogId, data);
  return NextResponse.json(allergy);
});

// DELETE /api/v1/dogs/:id/medical/allergies/:allergyId
export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId, allergyId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  await medicalService.deleteAllergy(allergyId, dogId);
  return NextResponse.json({ message: 'Allergy record deleted successfully' });
});
