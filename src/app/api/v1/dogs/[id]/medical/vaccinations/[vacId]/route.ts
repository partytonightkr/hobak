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

const updateVaccinationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  dateAdministered: dateString.optional(),
  nextDueDate: dateString.nullable().optional(),
  vetName: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// PUT /api/v1/dogs/:id/medical/vaccinations/:vacId
export const PUT = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId, vacId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const body = await req.json();
  const data = validateBody(updateVaccinationSchema, body);

  const vaccination = await medicalService.updateVaccination(vacId, dogId, data);
  return NextResponse.json(vaccination);
});

// DELETE /api/v1/dogs/:id/medical/vaccinations/:vacId
export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId, vacId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  await medicalService.deleteVaccination(vacId, dogId);
  return NextResponse.json({ message: 'Vaccination record deleted successfully' });
});
