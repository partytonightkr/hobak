import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import { prisma } from '@/lib/server/db';
import { NotFoundError } from '@/lib/server/utils/errors';
import { createReport } from '@/lib/server/services/moderation.service';

const reportSchema = z.object({
  reason: z.enum([
    'SPAM',
    'HARASSMENT',
    'HATE_SPEECH',
    'VIOLENCE',
    'NUDITY',
    'MISINFORMATION',
    'IMPERSONATION',
    'OTHER',
  ]),
  description: z.string().max(1000).optional(),
});

// POST /api/v1/posts/:id/report
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const user = requireAuth();
  const body = await req.json();
  const { reason, description } = validateBody(reportSchema, body);

  const post = await prisma.post.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, authorId: true },
  });

  if (!post) throw new NotFoundError('Post');

  const report = await createReport({
    reporterId: user.userId,
    targetType: 'post',
    targetId: post.id,
    reason,
    description,
  });

  return NextResponse.json(
    { message: 'Report submitted successfully', reportId: report.id },
    { status: 201 },
  );
});
