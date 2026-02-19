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

const updateMedicationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  dosage: z.string().min(1).max(200).optional(),
  frequency: z.string().min(1).max(200).optional(),
  startDate: dateString.optional(),
  endDate: dateString.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// PUT /api/v1/dogs/:id/medical/medications/:medId
export const PUT = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId, medId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const body = await req.json();
  const data = validateBody(updateMedicationSchema, body);

  const medication = await medicalService.updateMedication(medId, dogId, data);
  return NextResponse.json(medication);
});

// DELETE /api/v1/dogs/:id/medical/medications/:medId
export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId, medId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  await medicalService.deleteMedication(medId, dogId);
  return NextResponse.json({ message: 'Medication record deleted successfully' });
});
