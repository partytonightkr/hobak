import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { validateBody } from '@/lib/server/validation';
import { verifyEmailSchema } from '@/lib/server/schemas/auth';
import * as authService from '@/lib/server/services/auth.service';

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const data = validateBody(verifyEmailSchema, body);
  await authService.verifyEmail(data.token);
  return NextResponse.json({ message: 'Email verified successfully.' });
});
