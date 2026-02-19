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

const createMedicationSchema = z.object({
  name: z.string().min(1).max(200),
  dosage: z.string().min(1).max(200),
  frequency: z.string().min(1).max(200),
  startDate: dateString,
  endDate: dateString.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// GET /api/v1/dogs/:id/medical/medications
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const medications = await medicalService.listMedications(dogId);
  return NextResponse.json({ data: medications });
});

// POST /api/v1/dogs/:id/medical/medications
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const body = await req.json();
  const data = validateBody(createMedicationSchema, body);

  const medication = await medicalService.createMedication(dogId, data);
  return NextResponse.json(medication, { status: 201 });
});
