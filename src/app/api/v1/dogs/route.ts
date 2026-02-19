import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import { prisma } from '@/lib/server/db';
import { ConflictError } from '@/lib/server/utils/errors';
import { saveUploadedFile } from '@/lib/server/services/upload.service';

const createDogSchema = z.object({
  name: z.string().min(1).max(100),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  breed: z.string().min(1).max(100),
  dateOfBirth: z.string().nullish(),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']).nullish(),
  bio: z.string().max(280).nullish(),
  avatarUrl: z.string().url().nullish(),
  coverUrl: z.string().url().nullish(),
  personalityTraits: z.union([z.array(z.string()).min(1).max(10), z.string()]).nullish(),
  temperamentNotes: z.string().max(1000).nullish(),
});

// Parse body from JSON or FormData depending on Content-Type
async function parseRequestBody(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const obj: Record<string, unknown> = {};
    const traits: string[] = [];
    let avatarFile: File | null = null;

    for (const [key, value] of formData.entries()) {
      if (key === 'avatar' && value instanceof File) {
        avatarFile = value;
      } else if (key === 'personalityTraits') {
        traits.push(value as string);
      } else {
        obj[key] = value;
      }
    }
    if (traits.length > 0) obj.personalityTraits = traits;
    return { body: obj, avatarFile };
  }
  return { body: await req.json(), avatarFile: null };
}

// POST /api/v1/dogs - Create a new dog profile (auth required)
export const POST = apiHandler(async (req: NextRequest) => {
  const authPayload = requireAuth();

  const { body, avatarFile } = await parseRequestBody(req);
  const data = validateBody(createDogSchema, body);

  // Normalize personalityTraits (could be a single string from FormData)
  const personalityTraits = typeof data.personalityTraits === 'string'
    ? [data.personalityTraits]
    : data.personalityTraits;

  // Save avatar if uploaded
  let avatarUrl = data.avatarUrl;
  if (avatarFile) {
    avatarUrl = await saveUploadedFile(avatarFile);
  }

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
      avatarUrl,
      coverUrl: data.coverUrl,
      personalityTraits: personalityTraits ?? [],
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
