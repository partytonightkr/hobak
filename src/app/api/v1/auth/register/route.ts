import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { validateBody } from '@/lib/server/validation';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { setRefreshCookie } from '@/lib/server/cookies';
import { registerSchema } from '@/lib/server/schemas/auth';
import * as authService from '@/lib/server/services/auth.service';

export const POST = apiHandler(async (req: NextRequest) => {
  const { allowed } = await checkRateLimit({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'auth' });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many authentication attempts, please try again later.' }, { status: 429 });
  }

  const body = await req.json();
  const data = validateBody(registerSchema, body);
  const { user, accessToken, refreshToken } = await authService.registerUser(data);

  const response = NextResponse.json({ user, accessToken }, { status: 201 });
  setRefreshCookie(response, refreshToken);
  return response;
});
