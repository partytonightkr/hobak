import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as aiAgentService from '@/lib/server/services/ai-agent.service';

const suggestReplySchema = z.object({
  commentText: z.string().min(1, 'Comment text is required').max(2000),
});

// POST /api/v1/dogs/:id/ai/suggest-reply - Suggest a reply to a comment in the dog's voice
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();

  const body = await req.json();
  const { commentText } = validateBody(suggestReplySchema, body);

  const result = await aiAgentService.suggestReply(dogId, user.userId, commentText);
  return NextResponse.json(result);
});
