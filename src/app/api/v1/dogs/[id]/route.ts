import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth, getAuthPayload } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import { prisma } from '@/lib/server/db';
import { NotFoundError, ForbiddenError } from '@/lib/server/utils/errors';

const updateDogSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  breed: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().optional().nullable(),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']).optional().nullable(),
  bio: z.string().max(280).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  coverUrl: z.string().url().optional().nullable(),
  personalityTraits: z.array(z.string()).min(1).max(10).optional(),
  temperamentNotes: z.string().max(1000).optional().nullable(),
});

async function resolveDog(idOrUsername: string) {
  const dog = await prisma.dog.findFirst({
    where: {
      OR: [{ id: idOrUsername }, { username: idOrUsername }],
      deletedAt: null,
    },
    select: { id: true, ownerId: true },
  });
  if (!dog) throw new NotFoundError('Dog');
  return dog;
}

// GET /api/v1/dogs/[id] - Get dog profile (optional auth)
export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const identifier = (await params).id;

  const dog = await prisma.dog.findFirst({
    where: {
      OR: [{ id: identifier }, { username: identifier }],
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
      owner: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          posts: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!dog) throw new NotFoundError('Dog');

  // Check if requester's primary dog follows this dog
  let isFollowing = false;
  const authPayload = getAuthPayload();
  if (authPayload) {
    const user = await prisma.user.findUnique({
      where: { id: authPayload.userId },
      select: { primaryDogId: true },
    });

    if (user?.primaryDogId && user.primaryDogId !== dog.id) {
      const follow = await prisma.follow.findFirst({
        where: {
          followerDogId: user.primaryDogId,
          followingDogId: dog.id,
        },
      });
      isFollowing = !!follow;
    }
  }

  return NextResponse.json({ ...dog, isFollowing });
});

// PATCH /api/v1/dogs/[id] - Update dog profile (auth required, owner only)
export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const authPayload = requireAuth();

  const dog = await resolveDog(id);

  // Only the owner can update their dog
  if (dog.ownerId !== authPayload.userId && authPayload.role !== 'ADMIN') {
    throw new ForbiddenError('You can only update your own dogs');
  }

  const body = await req.json();
  const data = validateBody(updateDogSchema, body);

  const updatedDog = await prisma.dog.update({
    where: { id: dog.id },
    data: {
      ...data,
      dateOfBirth: data.dateOfBirth !== undefined
        ? (data.dateOfBirth ? new Date(data.dateOfBirth) : null)
        : undefined,
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
      updatedAt: true,
    },
  });

  return NextResponse.json(updatedDog);
});

// DELETE /api/v1/dogs/[id] - Soft delete dog (auth required, owner only)
export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const authPayload = requireAuth();

  const dog = await resolveDog(id);

  // Only the owner can delete their dog
  if (dog.ownerId !== authPayload.userId && authPayload.role !== 'ADMIN') {
    throw new ForbiddenError('You can only delete your own dogs');
  }

  // Soft delete the dog
  await prisma.dog.update({
    where: { id: dog.id },
    data: { deletedAt: new Date() },
  });

  // If this was the primary dog, clear it
  const user = await prisma.user.findUnique({
    where: { id: authPayload.userId },
    select: { primaryDogId: true },
  });

  if (user?.primaryDogId === dog.id) {
    // Try to set another dog as primary, or clear the field
    const nextDog = await prisma.dog.findFirst({
      where: {
        ownerId: authPayload.userId,
        deletedAt: null,
        id: { not: dog.id },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    await prisma.user.update({
      where: { id: authPayload.userId },
      data: { primaryDogId: nextDog?.id ?? null },
    });
  }

  // Update hasDogs flag if no more dogs remain
  const remainingDogCount = await prisma.dog.count({
    where: { ownerId: authPayload.userId, deletedAt: null, id: { not: dog.id } },
  });

  if (remainingDogCount === 0) {
    await prisma.user.update({
      where: { id: authPayload.userId },
      data: { hasDogs: false },
    });
  }

  return NextResponse.json({ message: 'Dog profile deleted successfully' });
});
