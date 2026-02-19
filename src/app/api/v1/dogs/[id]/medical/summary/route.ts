import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import * as medicalService from '@/lib/server/services/medical.service';

// GET /api/v1/dogs/:id/medical/summary
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const summary = await medicalService.getMedicalSummary(dogId);
  return NextResponse.json(summary);
});
