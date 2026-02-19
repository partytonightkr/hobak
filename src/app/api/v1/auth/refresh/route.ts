import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { getRefreshToken, setRefreshCookie, clearRefreshCookie } from '@/lib/server/cookies';
import * as authService from '@/lib/server/services/auth.service';

export const POST = apiHandler(async () => {
  const oldToken = getRefreshToken();
  if (!oldToken) {
    return NextResponse.json({ error: 'No refresh token provided' }, { status: 401 });
  }

  try {
    const { accessToken, refreshToken } = await authService.refreshTokens(oldToken);
    const response = NextResponse.json({ accessToken });
    setRefreshCookie(response, refreshToken);
    return response;
  } catch (error) {
    const response = NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    clearRefreshCookie(response);
    throw error;
  }
});
