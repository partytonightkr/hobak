import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { NotFoundError, ForbiddenError, ConflictError } from '@/lib/server/utils/errors';
import { createNotification } from '@/lib/server/services/notification.service';

async function resolveUserId(idOrUsername: string): Promise<string> {
  const user = await prisma.user.findFirst({
    where: { OR: [{ id: idOrUsername }, { username: idOrUsername }], deletedAt: null },
    select: { id: true },
  });
  if (!user) throw new NotFoundError('User');
  return user.id;
}

// POST /api/v1/users/[id]/follow - Follow a user (auth required)
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const authPayload = requireAuth();
  const targetUserId = await resolveUserId(id);

  // Cannot follow yourself
  if (authPayload.userId === targetUserId) {
    throw new ForbiddenError('You cannot follow yourself');
  }

  // Check if blocked
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: targetUserId, blockedId: authPayload.userId },
        { blockerId: authPayload.userId, blockedId: targetUserId },
      ],
    },
  });

  if (block) {
    throw new ForbiddenError('Unable to follow this user');
  }

  // Check if already following
  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: authPayload.userId,
        followingId: targetUserId,
      },
    },
  });

  if (existingFollow) {
    throw new ConflictError('You are already following this user');
  }

  // Create follow + atomically update counts in a transaction
  await prisma.$transaction([
    prisma.follow.create({
      data: {
        followerId: authPayload.userId,
        followingId: targetUserId,
      },
    }),
    prisma.user.update({
      where: { id: authPayload.userId },
      data: { followingCount: { increment: 1 } },
    }),
    prisma.user.update({
      where: { id: targetUserId },
      data: { followerCount: { increment: 1 } },
    }),
  ]);

  // Send notification (non-blocking)
  await createNotification({
    type: 'FOLLOW',
    recipientId: targetUserId,
    actorId: authPayload.userId,
    targetId: targetUserId,
    targetType: 'user',
  });

  return NextResponse.json({ message: 'Followed successfully' }, { status: 201 });
});

// DELETE /api/v1/users/[id]/follow - Unfollow a user (auth required)
export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const authPayload = requireAuth();
  const targetUserId = await resolveUserId(id);

  // Check if actually following
  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: authPayload.userId,
        followingId: targetUserId,
      },
    },
  });

  if (!existingFollow) {
    throw new NotFoundError('Follow relationship');
  }

  // Delete follow + atomically update counts in a transaction
  await prisma.$transaction([
    prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: authPayload.userId,
          followingId: targetUserId,
        },
      },
    }),
    prisma.user.update({
      where: { id: authPayload.userId },
      data: { followingCount: { decrement: 1 } },
    }),
    prisma.user.update({
      where: { id: targetUserId },
      data: { followerCount: { decrement: 1 } },
    }),
  ]);

  return NextResponse.json({ message: 'Unfollowed successfully' });
});
