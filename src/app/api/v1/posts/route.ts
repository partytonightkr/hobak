import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import { prisma } from '@/lib/server/db';
import { NotFoundError } from '@/lib/server/utils/errors';
import { sanitizeContent } from '@/lib/server/utils/sanitize';
import { syncPostHashtags } from '@/lib/server/services/hashtag.service';
import { createNotification } from '@/lib/server/services/notification.service';

const createPostSchema = z.object({
  content: z.string().min(1).max(2000),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS_ONLY']).default('PUBLIC'),
  repostOfId: z.string().optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = requireAuth();
  const body = await req.json();
  const { content: rawContent, visibility, repostOfId } = validateBody(createPostSchema, body);

  const content = sanitizeContent(rawContent);

  // If reposting, verify original post exists
  if (repostOfId) {
    const original = await prisma.post.findUnique({
      where: { id: repostOfId, deletedAt: null },
    });
    if (!original) throw new NotFoundError('Original post');
  }

  // Create post and increment shares count atomically if reposting
  const txOps: any[] = [
    prisma.post.create({
      data: {
        content,
        visibility,
        authorId: user.userId,
        repostOfId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        repostOf: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    }),
  ];
  if (repostOfId) {
    txOps.push(
      prisma.post.update({
        where: { id: repostOfId },
        data: { sharesCount: { increment: 1 } },
      }),
    );
  }
  const [post] = await prisma.$transaction(txOps);

  // Extract and link hashtags
  await syncPostHashtags(post.id, content);

  // Notify reposted user
  if (repostOfId) {
    const original = await prisma.post.findUnique({
      where: { id: repostOfId },
      select: { authorId: true },
    });
    if (original) {
      await createNotification({
        type: 'REPOST',
        recipientId: original.authorId,
        actorId: user.userId,
        targetId: post.id,
        targetType: 'post',
      });
    }
  }

  // Notify mentioned users
  const mentionRegex = /@(\w+)/g;
  const mentions = [...content.matchAll(mentionRegex)].map((m) => m[1]);
  for (const username of [...new Set(mentions)]) {
    const mentioned = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (mentioned && mentioned.id !== user.userId) {
      await createNotification({
        type: 'MENTION',
        recipientId: mentioned.id,
        actorId: user.userId,
        targetId: post.id,
        targetType: 'post',
      });
    }
  }

  return NextResponse.json(post, { status: 201 });
});
