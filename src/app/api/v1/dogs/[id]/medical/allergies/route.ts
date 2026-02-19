import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as medicalService from '@/lib/server/services/medical.service';

const createAllergySchema = z.object({
  allergen: z.string().min(1).max(200),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE']),
  notes: z.string().max(2000).nullable().optional(),
});

// GET /api/v1/dogs/:id/medical/allergies
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const allergies = await medicalService.listAllergies(dogId);
  return NextResponse.json({ data: allergies });
});

// POST /api/v1/dogs/:id/medical/allergies
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const body = await req.json();
  const data = validateBody(createAllergySchema, body);

  const allergy = await medicalService.createAllergy(dogId, data);
  return NextResponse.json(allergy, { status: 201 });
});
