import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth, getAuthPayload } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import { prisma } from '@/lib/server/db';
import { NotFoundError, ForbiddenError } from '@/lib/server/utils/errors';

const updateUserSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  profile: z
    .object({
      website: z.string().url().max(200).optional().nullable(),
      location: z.string().max(100).optional().nullable(),
      coverImageUrl: z.string().url().optional().nullable(),
      birthday: z.string().datetime().optional().nullable(),
    })
    .optional(),
});

// GET /api/v1/users/[id] - Get user profile (optional auth)
export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const identifier = (await params).id;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: identifier }, { username: identifier }],
      deletedAt: null,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      isVerified: true,
      followerCount: true,
      followingCount: true,
      createdAt: true,
      profile: {
        select: {
          coverImageUrl: true,
          website: true,
          location: true,
        },
      },
      _count: {
        select: {
          posts: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!user) throw new NotFoundError('User');

  // Check if current user follows this user
  let isFollowing = false;
  const authPayload = getAuthPayload();
  if (authPayload && authPayload.userId !== user.id) {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: authPayload.userId,
          followingId: user.id,
        },
      },
    });
    isFollowing = !!follow;
  }

  return NextResponse.json({ ...user, isFollowing });
});

// PATCH /api/v1/users/[id] - Update user profile (auth required)
export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const authPayload = requireAuth();

  // Only the user themselves or admins can update
  if (authPayload.userId !== id && authPayload.role !== 'ADMIN') {
    throw new ForbiddenError('You can only update your own profile');
  }

  const body = await req.json();
  const data = validateBody(updateUserSchema, body);

  const { profile: profileData, ...userData } = data;

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      ...userData,
      ...(profileData
        ? {
            profile: {
              upsert: {
                create: profileData,
                update: profileData,
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      isVerified: true,
      followerCount: true,
      followingCount: true,
      createdAt: true,
      profile: {
        select: {
          coverImageUrl: true,
          website: true,
          location: true,
          birthday: true,
        },
      },
    },
  });

  return NextResponse.json(updatedUser);
});
