import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as aiAgentService from '@/lib/server/services/ai-agent.service';

const updateConfigSchema = z.object({
  personalityTraits: z
    .array(z.string().min(1).max(50))
    .max(10, 'Maximum 10 personality traits allowed')
    .optional(),
  temperamentNotes: z.string().max(2000).optional(),
});

// GET /api/v1/dogs/:id/ai/config - Returns the dog's AI config (without system prompt)
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();

  const config = await aiAgentService.getAIConfig(dogId, user.userId);
  return NextResponse.json(config);
});

// POST /api/v1/dogs/:id/ai/config - Update AI config (personality traits -> regenerate prompt)
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();

  const body = await req.json();
  const data = validateBody(updateConfigSchema, body);

  const config = await aiAgentService.updateAIConfig(dogId, user.userId, data);
  return NextResponse.json(config);
});
