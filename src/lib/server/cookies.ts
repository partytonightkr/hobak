import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { env } from './config/env';

const REFRESH_COOKIE_NAME = 'refresh_token';

export function setRefreshCookie(response: NextResponse, refreshToken: string): void {
  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

export function clearRefreshCookie(response: NextResponse): void {
  response.cookies.set(REFRESH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 0,
  });
}

export function getRefreshToken(): string | undefined {
  const cookieStore = cookies();
  return cookieStore.get(REFRESH_COOKIE_NAME)?.value;
}
