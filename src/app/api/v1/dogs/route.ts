import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import { prisma } from '@/lib/server/db';
import { ConflictError } from '@/lib/server/utils/errors';

const createDogSchema = z.object({
  name: z.string().min(1).max(100),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  breed: z.string().min(1).max(100),
  dateOfBirth: z.string().optional(),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']).optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(),
  personalityTraits: z.array(z.string()).min(1).max(10).optional(),
  temperamentNotes: z.string().max(1000).optional(),
});

// POST /api/v1/dogs - Create a new dog profile (auth required)
export const POST = apiHandler(async (req: NextRequest) => {
  const authPayload = requireAuth();

  const body = await req.json();
  const data = validateBody(createDogSchema, body);

  // Check username uniqueness across both dogs AND users
  const [existingDog, existingUser] = await Promise.all([
    prisma.dog.findUnique({ where: { username: data.username }, select: { id: true } }),
    prisma.user.findFirst({ where: { username: data.username }, select: { id: true } }),
  ]);

  if (existingDog || existingUser) {
    throw new ConflictError('Username is already taken');
  }

  // Check current dog count to determine if this is the first dog
  const currentDogCount = await prisma.dog.count({
    where: { ownerId: authPayload.userId, deletedAt: null },
  });

  const dog = await prisma.dog.create({
    data: {
      ownerId: authPayload.userId,
      name: data.name,
      username: data.username,
      breed: data.breed,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      size: data.size,
      bio: data.bio,
      avatarUrl: data.avatarUrl,
      coverUrl: data.coverUrl,
      personalityTraits: data.personalityTraits ?? [],
      temperamentNotes: data.temperamentNotes,
    },
  });

  // Update user: set hasDogs=true, and if first dog set primaryDogId
  await prisma.user.update({
    where: { id: authPayload.userId },
    data: {
      hasDogs: true,
      ...(currentDogCount === 0 ? { primaryDogId: dog.id } : {}),
    },
  });

  return NextResponse.json(dog, { status: 201 });
});
