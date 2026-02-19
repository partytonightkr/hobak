import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { NotFoundError, ForbiddenError, ConflictError } from '@/lib/server/utils/errors';
import { createNotification } from '@/lib/server/services/notification.service';

async function resolveDogId(idOrUsername: string): Promise<{ id: string; ownerId: string }> {
  const dog = await prisma.dog.findFirst({
    where: { OR: [{ id: idOrUsername }, { username: idOrUsername }], deletedAt: null },
    select: { id: true, ownerId: true },
  });
  if (!dog) throw new NotFoundError('Dog');
  return dog;
}

// POST /api/v1/dogs/[id]/follow - Follow a dog (uses requester's primaryDog, auth required)
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const authPayload = requireAuth();

  const targetDog = await resolveDogId(id);

  // Get requester's primary dog
  const user = await prisma.user.findUnique({
    where: { id: authPayload.userId },
    select: { primaryDogId: true },
  });

  if (!user?.primaryDogId) {
    throw new ForbiddenError('You must have a primary dog to follow other dogs');
  }

  // Cannot follow yourself
  if (user.primaryDogId === targetDog.id) {
    throw new ForbiddenError('A dog cannot follow itself');
  }

  // Check if already following
  const existingFollow = await prisma.follow.findFirst({
    where: {
      followerDogId: user.primaryDogId,
      followingDogId: targetDog.id,
    },
  });

  if (existingFollow) {
    throw new ConflictError('Your dog is already following this dog');
  }

  // Create dog-to-dog follow + atomically update counts in a transaction
  await prisma.$transaction([
    prisma.follow.create({
      data: {
        followerId: authPayload.userId,
        followingId: targetDog.ownerId,
        followerDogId: user.primaryDogId,
        followingDogId: targetDog.id,
      },
    }),
    prisma.dog.update({
      where: { id: user.primaryDogId },
      data: { followingCount: { increment: 1 } },
    }),
    prisma.dog.update({
      where: { id: targetDog.id },
      data: { followerCount: { increment: 1 } },
    }),
  ]);

  // Send notification to the dog's owner
  await createNotification({
    type: 'FOLLOW',
    recipientId: targetDog.ownerId,
    actorId: authPayload.userId,
    targetId: targetDog.id,
    targetType: 'dog',
  });

  return NextResponse.json({ message: 'Dog followed successfully' }, { status: 201 });
});

// DELETE /api/v1/dogs/[id]/follow - Unfollow a dog (auth required)
export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const authPayload = requireAuth();

  const targetDog = await resolveDogId(id);

  // Get requester's primary dog
  const user = await prisma.user.findUnique({
    where: { id: authPayload.userId },
    select: { primaryDogId: true },
  });

  if (!user?.primaryDogId) {
    throw new ForbiddenError('You must have a primary dog to manage follows');
  }

  // Find the follow relationship
  const existingFollow = await prisma.follow.findFirst({
    where: {
      followerDogId: user.primaryDogId,
      followingDogId: targetDog.id,
    },
  });

  if (!existingFollow) {
    throw new NotFoundError('Follow relationship');
  }

  // Delete follow + atomically update counts in a transaction
  await prisma.$transaction([
    prisma.follow.delete({
      where: { id: existingFollow.id },
    }),
    prisma.dog.update({
      where: { id: user.primaryDogId },
      data: { followingCount: { decrement: 1 } },
    }),
    prisma.dog.update({
      where: { id: targetDog.id },
      data: { followerCount: { decrement: 1 } },
    }),
  ]);

  return NextResponse.json({ message: 'Dog unfollowed successfully' });
});
