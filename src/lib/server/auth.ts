import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { UnauthorizedError } from './utils/errors';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function getAuthPayload(): JwtPayload | null {
  const headerStore = headers();
  const authHeader = headerStore.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function requireAuth(): JwtPayload {
  const payload = getAuthPayload();
  if (!payload) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }
  return payload;
}

export function requireRole(payload: JwtPayload, ...roles: string[]): void {
  if (!roles.includes(payload.role)) {
    throw new UnauthorizedError('Insufficient permissions');
  }
}
