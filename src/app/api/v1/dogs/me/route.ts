import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';

// GET /api/v1/dogs/me - Get current user's dogs (auth required)
export const GET = apiHandler(async () => {
  const authPayload = requireAuth();

  const dogs = await prisma.dog.findMany({
    where: {
      ownerId: authPayload.userId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      username: true,
      breed: true,
      dateOfBirth: true,
      size: true,
      bio: true,
      avatarUrl: true,
      coverUrl: true,
      personalityTraits: true,
      temperamentNotes: true,
      isVerified: true,
      followerCount: true,
      followingCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Also get user's primaryDogId so the client knows which is primary
  const user = await prisma.user.findUnique({
    where: { id: authPayload.userId },
    select: { primaryDogId: true },
  });

  return NextResponse.json({
    data: dogs,
    primaryDogId: user?.primaryDogId ?? null,
  });
});
