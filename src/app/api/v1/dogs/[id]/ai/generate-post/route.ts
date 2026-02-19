import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as aiAgentService from '@/lib/server/services/ai-agent.service';

const generatePostSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500),
});

// POST /api/v1/dogs/:id/ai/generate-post - Generate a social media post in the dog's voice
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();

  const body = await req.json();
  const { topic } = validateBody(generatePostSchema, body);

  const result = await aiAgentService.generatePost(dogId, user.userId, topic);
  return NextResponse.json(result);
});
