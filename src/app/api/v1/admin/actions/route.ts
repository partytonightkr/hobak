import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth, requireRole } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as moderationService from '@/lib/server/services/moderation.service';

const takeActionSchema = z.object({
  targetId: z.string(),
  action: z.enum(['WARN', 'MUTE', 'SUSPEND', 'BAN', 'CONTENT_REMOVE', 'CONTENT_HIDE']),
  reason: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
});

// POST /api/v1/admin/actions - Take a moderation action on a user (ADMIN/MODERATOR only)
export const POST = apiHandler(async (req: NextRequest) => {
  const user = requireAuth();
  requireRole(user, 'ADMIN', 'MODERATOR');

  const body = await req.json();
  const data = validateBody(takeActionSchema, body);

  const log = await moderationService.takeAction({
    targetId: data.targetId,
    moderatorId: user.userId,
    action: data.action,
    reason: data.reason,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
  });

  return NextResponse.json(log, { status: 201 });
});
