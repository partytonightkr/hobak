import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import * as authService from '@/lib/server/services/auth.service';

export const POST = apiHandler(async () => {
  const { allowed } = await checkRateLimit({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'auth' });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests, please try again later.' }, { status: 429 });
  }

  const user = requireAuth();
  await authService.requestEmailVerification(user.userId);
  return NextResponse.json({ message: 'Verification email sent.' });
});
