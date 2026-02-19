import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as aiAgentService from '@/lib/server/services/ai-agent.service';

const captionSchema = z.object({
  imageDescription: z.string().min(1, 'Image description is required').max(1000),
});

// POST /api/v1/dogs/:id/ai/caption - Generate a photo caption in the dog's voice
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id: dogId } = await params;
  const user = requireAuth();

  const body = await req.json();
  const { imageDescription } = validateBody(captionSchema, body);

  const result = await aiAgentService.generateCaption(dogId, user.userId, imageDescription);
  return NextResponse.json(result);
});
