import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import * as medicalService from '@/lib/server/services/medical.service';

// DELETE /api/v1/dogs/:id/medical/weight/:weightId
export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId, weightId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  await medicalService.deleteWeightLog(weightId, dogId);
  return NextResponse.json({ message: 'Weight log entry deleted successfully' });
});
