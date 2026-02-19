// v1.1 FEATURE - Trending posts and hashtags
// Not mounted in MVP; will be enabled when trending/discovery ships.

import { prisma } from '../config/prisma';

interface TrendingPost {
  id: string;
  content: string;
  mediaUrls: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  score: number;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
}

interface TrendingHashtag {
  id: string;
  name: string;
  postsCount: number;
  recentPostsCount: number;
}

/**
 * Trending posts algorithm.
 *
 * Score = (likes * 1.0 + comments * 2.0 + shares * 3.0) / (age_hours + 2) ^ 1.5
 *
 * This gives a time-decayed engagement score where:
 * - Shares are weighted highest (they represent the strongest signal)
 * - Comments are weighted more than likes (higher effort engagement)
 * - Recency matters: newer posts with similar engagement rank higher
 * - The +2 in the denominator prevents division by zero and gives very new posts a fair chance
 */
export async function getTrendingPosts(limit = 20, offset = 0): Promise<TrendingPost[]> {
  const posts = await prisma.$queryRaw<
    Array<{
      id: string;
      content: string;
      media_urls: string[];
      likes_count: number;
      comments_count: number;
      shares_count: number;
      created_at: Date;
      score: number;
      author_id: string;
      author_username: string;
      author_display_name: string;
      author_avatar_url: string | null;
      author_is_verified: boolean;
    }>
  >`
    SELECT
      p.id,
      p.content,
      p.media_urls,
      p.likes_count,
      p.comments_count,
      p.shares_count,
      p.created_at,
      (
        (p.likes_count * 1.0 + p.comments_count * 2.0 + p.shares_count * 3.0)
        / POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0 + 2, 1.5)
      ) AS score,
      u.id AS author_id,
      u.username AS author_username,
      u.display_name AS author_display_name,
      u.avatar_url AS author_avatar_url,
      u.is_verified AS author_is_verified
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.deleted_at IS NULL
      AND p.visibility = 'PUBLIC'
      AND p.created_at > NOW() - INTERVAL '72 hours'
    ORDER BY score DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return posts.map((p) => ({
    id: p.id,
    content: p.content,
    mediaUrls: p.media_urls,
    likesCount: p.likes_count,
    commentsCount: p.comments_count,
    sharesCount: p.shares_count,
    createdAt: p.created_at,
    score: Number(p.score),
    author: {
      id: p.author_id,
      username: p.author_username,
      displayName: p.author_display_name,
      avatarUrl: p.author_avatar_url,
      isVerified: p.author_is_verified,
    },
  }));
}

/**
 * Trending hashtags based on post volume in the last 24 hours.
 * Returns hashtags sorted by recent activity rather than all-time count.
 */
export async function getTrendingHashtags(limit = 10): Promise<TrendingHashtag[]> {
  const hashtags = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      posts_count: number;
      recent_posts_count: bigint;
    }>
  >`
    SELECT
      h.id,
      h.name,
      h.posts_count,
      COUNT(ph.post_id) AS recent_posts_count
    FROM hashtags h
    JOIN post_hashtags ph ON ph.hashtag_id = h.id
    JOIN posts p ON p.id = ph.post_id
    WHERE p.deleted_at IS NULL
      AND p.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY h.id, h.name, h.posts_count
    ORDER BY recent_posts_count DESC, h.posts_count DESC
    LIMIT ${limit}
  `;

  return hashtags.map((h) => ({
    id: h.id,
    name: h.name,
    postsCount: h.posts_count,
    recentPostsCount: Number(h.recent_posts_count),
  }));
}

/**
 * Get posts for a specific hashtag, ordered by recency.
 */
export async function getHashtagFeed(hashtagName: string, limit = 20, cursor?: string) {
  const normalizedName = hashtagName.replace(/^#/, '').toLowerCase();

  const hashtag = await prisma.hashtag.findUnique({
    where: { name: normalizedName },
  });

  if (!hashtag) {
    return { hashtag: null, posts: [], nextCursor: null, hasMore: false };
  }

  const whereClause: Record<string, unknown> = {
    postHashtags: { some: { hashtagId: hashtag.id } },
    deletedAt: null,
    visibility: 'PUBLIC' as const,
  };

  if (cursor) {
    const cursorPost = await prisma.post.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    });
    if (cursorPost) {
      whereClause.createdAt = { lt: cursorPost.createdAt };
    }
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    select: {
      id: true,
      content: true,
      mediaUrls: true,
      likesCount: true,
      commentsCount: true,
      sharesCount: true,
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
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = posts.length > limit;
  const data = hasMore ? posts.slice(0, limit) : posts;

  return {
    hashtag: { id: hashtag.id, name: hashtag.name, postsCount: hashtag.postsCount },
    posts: data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  };
}
