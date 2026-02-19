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

const createVaccinationSchema = z.object({
  name: z.string().min(1).max(200),
  dateAdministered: dateString,
  nextDueDate: dateString.nullable().optional(),
  vetName: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// GET /api/v1/dogs/:id/medical/vaccinations
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const vaccinations = await medicalService.listVaccinations(dogId);
  return NextResponse.json({ data: vaccinations });
});

// POST /api/v1/dogs/:id/medical/vaccinations
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const body = await req.json();
  const data = validateBody(createVaccinationSchema, body);

  const vaccination = await medicalService.createVaccination(dogId, data);
  return NextResponse.json(vaccination, { status: 201 });
});
