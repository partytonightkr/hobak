import { prisma } from '../config/prisma';

/**
 * Extract hashtags from post content.
 * Matches #word patterns, normalizes to lowercase.
 */
export function extractHashtags(content: string): string[] {
  const matches = content.match(/#([a-zA-Z0-9_]+)/g);
  if (!matches) return [];

  const unique = [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
  return unique;
}

/**
 * Sync hashtags for a post.
 * Creates new hashtags if they don't exist, increments counts,
 * and creates PostHashtag join records.
 */
export async function syncPostHashtags(postId: string, content: string): Promise<void> {
  const hashtagNames = extractHashtags(content);

  if (hashtagNames.length === 0) return;

  // Remove existing hashtag associations for this post
  const existingAssociations = await prisma.postHashtag.findMany({
    where: { postId },
    select: { hashtagId: true },
  });

  if (existingAssociations.length > 0) {
    // Decrement counts for old hashtags
    await prisma.hashtag.updateMany({
      where: { id: { in: existingAssociations.map((a) => a.hashtagId) } },
      data: { postsCount: { decrement: 1 } },
    });

    await prisma.postHashtag.deleteMany({ where: { postId } });
  }

  // Upsert each hashtag and create associations
  for (const name of hashtagNames) {
    const hashtag = await prisma.hashtag.upsert({
      where: { name },
      create: { name, postsCount: 1 },
      update: { postsCount: { increment: 1 } },
    });

    await prisma.postHashtag.create({
      data: { postId, hashtagId: hashtag.id },
    });
  }
}

/**
 * Remove hashtag associations when a post is deleted.
 * Decrements the postsCount on each associated hashtag.
 */
export async function removePostHashtags(postId: string): Promise<void> {
  const associations = await prisma.postHashtag.findMany({
    where: { postId },
    select: { hashtagId: true },
  });

  if (associations.length === 0) return;

  await prisma.hashtag.updateMany({
    where: { id: { in: associations.map((a) => a.hashtagId) } },
    data: { postsCount: { decrement: 1 } },
  });

  await prisma.postHashtag.deleteMany({ where: { postId } });
}
