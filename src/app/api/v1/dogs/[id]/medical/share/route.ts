import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as medicalService from '@/lib/server/services/medical.service';

const createShareLinkSchema = z.object({
  expiresInDays: z.number().int().min(1).max(365).default(7),
});

// POST /api/v1/dogs/:id/medical/share
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();
  await medicalService.verifyDogOwnership(dogId, user.userId);

  const body = await req.json();
  const { expiresInDays } = validateBody(createShareLinkSchema, body);

  const shareLink = await medicalService.createShareLink(dogId, expiresInDays);

  // Build the shareable URL from request headers
  const headerStore = headers();
  const host = headerStore.get('host') || 'localhost:3000';
  const protocol = headerStore.get('x-forwarded-proto') || 'http';
  const url = `${protocol}://${host}/api/v1/medical-shares/${shareLink.token}`;

  return NextResponse.json(
    {
      token: shareLink.token,
      url,
      expiresAt: shareLink.expiresAt,
    },
    { status: 201 },
  );
});
