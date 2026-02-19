import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import * as medicalService from '@/lib/server/services/medical.service';

// DELETE /api/v1/dogs/:id/medical/shares/:shareId
export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId, shareId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  await medicalService.revokeShareLink(shareId, dogId);
  return NextResponse.json({ message: 'Share link revoked successfully' });
});
