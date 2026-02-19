import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { validateBody } from '@/lib/server/validation';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { forgotPasswordSchema } from '@/lib/server/schemas/auth';
import * as authService from '@/lib/server/services/auth.service';

export const POST = apiHandler(async (req: NextRequest) => {
  const { allowed } = await checkRateLimit({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'auth' });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests, please try again later.' }, { status: 429 });
  }

  const body = await req.json();
  const data = validateBody(forgotPasswordSchema, body);
  await authService.requestPasswordReset(data.email);
  return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' });
});
