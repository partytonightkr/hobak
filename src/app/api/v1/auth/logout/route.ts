import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { getRefreshToken, clearRefreshCookie } from '@/lib/server/cookies';
import * as authService from '@/lib/server/services/auth.service';

export const POST = apiHandler(async () => {
  const token = getRefreshToken();
  if (token) {
    await authService.logoutUser(token);
  }
  const response = NextResponse.json({ message: 'Logged out successfully' });
  clearRefreshCookie(response);
  return response;
});
