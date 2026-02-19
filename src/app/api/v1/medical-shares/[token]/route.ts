import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import * as medicalService from '@/lib/server/services/medical.service';

// GET /api/v1/medical-shares/:token - Public, no auth required
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { token } = await params;
  const data = await medicalService.getSharedMedicalData(token);
  return NextResponse.json(data);
});
