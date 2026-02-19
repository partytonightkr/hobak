import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import * as authService from '@/lib/server/services/auth.service';

export const GET = apiHandler(async () => {
  const user = requireAuth();
  const result = await authService.getMe(user.userId);
  return NextResponse.json(result);
});
