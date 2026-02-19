import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import { changePasswordSchema } from '@/lib/server/schemas/auth';
import * as authService from '@/lib/server/services/auth.service';

export const POST = apiHandler(async (req: NextRequest) => {
  const user = requireAuth();
  const body = await req.json();
  const data = validateBody(changePasswordSchema, body);
  await authService.changePassword(user.userId, data.currentPassword, data.newPassword);
  return NextResponse.json({ message: 'Password changed successfully.' });
});
