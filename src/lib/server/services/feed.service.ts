import { prisma } from '../db';
import { ValidationError } from '../utils/errors';
import type { PaginationParams } from '../utils/pagination';

async function resolveCursorDate(cursor: string): Promise<Date> {
  const post = await prisma.post.findUnique({
    where: { id: cursor },
    select: { createdAt: true },
  });
  if (!post) {
    throw new ValidationError('Invalid cursor: post not found');
  }
  return post.createdAt;
}

const POST_SELECT = {
  id: true,
  content: true,
  mediaUrls: true,
  visibility: true,
  isEdited: true,
  likesCount: true,
  commentsCount: true,
  sharesCount: true,
  createdAt: true,
  repostOfId: true,
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
      mediaUrls: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
        },
      },
    },
  },
} as const;

export async function getFeed(userId: string, params: PaginationParams) {
  const { cursor, limit } = params;

  // Get IDs of users the current user follows
  const followingIds = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  const authorIds = [userId, ...followingIds.map((f) => f.followingId)];

  const cursorDate = cursor ? await resolveCursorDate(cursor) : undefined;

  const posts = await prisma.post.findMany({
    where: {
      authorId: { in: authorIds },
      deletedAt: null,
      OR: [
        { visibility: 'PUBLIC' },
        { visibility: 'FOLLOWERS_ONLY', authorId: { in: authorIds } },
      ],
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    },
    select: POST_SELECT,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = posts.length > limit;
  const data = hasMore ? posts.slice(0, limit) : posts;

  return {
    data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  };
}

export async function getExploreFeed(params: PaginationParams) {
  const { cursor, limit } = params;

  const cursorDate = cursor ? await resolveCursorDate(cursor) : undefined;

  const posts = await prisma.post.findMany({
    where: {
      visibility: 'PUBLIC',
      deletedAt: null,
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    },
    select: POST_SELECT,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = posts.length > limit;
  const data = hasMore ? posts.slice(0, limit) : posts;

  return {
    data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  };
}

export async function getUserPosts(userId: string, viewerId: string | undefined, params: PaginationParams) {
  const { cursor, limit } = params;

  const isOwner = viewerId === userId;
  let isFollower = false;
  if (viewerId && !isOwner) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: userId } },
    });
    isFollower = !!follow;
  }

  const visibilityFilter = isOwner
    ? {}
    : isFollower
      ? { visibility: { in: ['PUBLIC' as const, 'FOLLOWERS_ONLY' as const] } }
      : { visibility: 'PUBLIC' as const };

  const cursorDate = cursor ? await resolveCursorDate(cursor) : undefined;

  const posts = await prisma.post.findMany({
    where: {
      authorId: userId,
      deletedAt: null,
      ...visibilityFilter,
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    },
    select: POST_SELECT,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = posts.length > limit;
  const data = hasMore ? posts.slice(0, limit) : posts;

  return {
    data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  };
}

// ---------------------------------------------------------------------------
// v1.1 FEATURE - Ranked / algorithmic feed
// Not mounted in MVP; MVP uses chronological getFeed above.
// ---------------------------------------------------------------------------

/**
 * Ranked feed that combines chronological ordering with engagement signals.
 *
 * Score = base_recency + engagement_boost
 *   base_recency  = 1.0 / (age_hours + 2)
 *   engagement    = (likes * 1.0 + comments * 2.0 + shares * 3.0)
 *   boost         = log2(engagement + 1) * 0.1
 *
 * Posts from users the viewer follows are given an extra +0.5 affinity bump.
 */
export async function getRankedFeed(userId: string, params: PaginationParams) {
  const { cursor, limit } = params;

  const followingIds = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingSet = new Set(followingIds.map((f) => f.followingId));

  const cursorDate = cursor ? await resolveCursorDate(cursor) : undefined;

  // Fetch a larger window of recent posts to rank client-side
  const windowSize = Math.max(limit * 5, 100);

  const posts = await prisma.post.findMany({
    where: {
      deletedAt: null,
      visibility: 'PUBLIC',
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    },
    select: {
      ...POST_SELECT,
      likesCount: true,
      commentsCount: true,
      sharesCount: true,
    },
    orderBy: { createdAt: 'desc' },
    take: windowSize,
  });

  const now = Date.now();
  const scored = posts.map((post) => {
    const ageHours = (now - new Date(post.createdAt).getTime()) / 3_600_000;
    const baseRecency = 1.0 / (ageHours + 2);
    const engagement = post.likesCount * 1.0 + post.commentsCount * 2.0 + post.sharesCount * 3.0;
    const engagementBoost = Math.log2(engagement + 1) * 0.1;
    const affinityBoost = followingSet.has(post.author.id) ? 0.5 : 0;
    const score = baseRecency + engagementBoost + affinityBoost;
    return { ...post, _score: score };
  });

  scored.sort((a, b) => b._score - a._score);

  const data = scored.slice(0, limit);
  const hasMore = scored.length > limit;

  return {
    data: data.map(({ _score, ...rest }) => rest),
    nextCursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  };
}
