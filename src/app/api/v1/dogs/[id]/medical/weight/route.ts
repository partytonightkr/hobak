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

const createWeightLogSchema = z.object({
  weightKg: z.number().min(0.01).max(999.99),
  date: dateString,
});

// GET /api/v1/dogs/:id/medical/weight
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const weightLogs = await medicalService.listWeightLogs(dogId);
  return NextResponse.json({ data: weightLogs });
});

// POST /api/v1/dogs/:id/medical/weight
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const body = await req.json();
  const data = validateBody(createWeightLogSchema, body);

  const weightLog = await medicalService.createWeightLog(dogId, data);
  return NextResponse.json(weightLog, { status: 201 });
});
