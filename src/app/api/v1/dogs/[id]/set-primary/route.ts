import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { NotFoundError, ForbiddenError } from '@/lib/server/utils/errors';

// PATCH /api/v1/dogs/[id]/set-primary - Set a dog as primary (auth required)
export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const authPayload = requireAuth();

  // Verify the dog exists and belongs to the user
  const dog = await prisma.dog.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: { id: true, ownerId: true, name: true, username: true },
  });

  if (!dog) throw new NotFoundError('Dog');

  if (dog.ownerId !== authPayload.userId) {
    throw new ForbiddenError('You can only set your own dogs as primary');
  }

  // Update user's primaryDogId
  await prisma.user.update({
    where: { id: authPayload.userId },
    data: { primaryDogId: dog.id },
  });

  return NextResponse.json({
    message: 'Primary dog updated successfully',
    primaryDog: {
      id: dog.id,
      name: dog.name,
      username: dog.username,
    },
  });
});
