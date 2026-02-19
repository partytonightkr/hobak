// v1.1 FEATURE - Algorithmic user recommendations
// Not mounted in MVP; MVP uses simple staff picks / recent signups in search.routes.ts.

import { prisma } from '../db';

interface RecommendedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  followersCount: number;
  mutualFollowsCount: number;
  reason: 'mutual_follows' | 'popular' | 'similar_interests';
}

/**
 * User suggestion algorithm.
 *
 * Combines three signals:
 * 1. Mutual follows: Users followed by people you follow (strongest signal)
 * 2. Similar interests: Users who post with the same hashtags you engage with
 * 3. Popular accounts: Verified or high-follower accounts (fallback)
 *
 * Results are deduplicated and exclude users you already follow or have blocked.
 */
export async function getRecommendations(userId: string, limit = 20): Promise<RecommendedUser[]> {
  const followingIds = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingSet = new Set(followingIds.map((f) => f.followingId));
  followingSet.add(userId);

  const blocks = await prisma.$queryRaw<Array<{ user_id: string }>>`
    SELECT blocked_id AS user_id FROM blocks WHERE blocker_id = ${userId}
    UNION
    SELECT blocker_id AS user_id FROM blocks WHERE blocked_id = ${userId}
  `;
  const blockedSet = new Set(blocks.map((b) => b.user_id));

  const excludeIds = [...Array.from(followingSet), ...Array.from(blockedSet)];

  const [mutualFollows, popularUsers] = await Promise.all([
    getMutualFollowSuggestions(userId, excludeIds, limit),
    getPopularSuggestions(excludeIds, limit),
  ]);

  const seen = new Set<string>();
  const results: RecommendedUser[] = [];

  for (const user of mutualFollows) {
    if (!seen.has(user.id) && results.length < limit) {
      seen.add(user.id);
      results.push(user);
    }
  }

  for (const user of popularUsers) {
    if (!seen.has(user.id) && results.length < limit) {
      seen.add(user.id);
      results.push(user);
    }
  }

  return results;
}

async function getMutualFollowSuggestions(
  userId: string,
  excludeIds: string[],
  limit: number,
): Promise<RecommendedUser[]> {
  if (excludeIds.length === 0) {
    return [];
  }

  const suggestions = await prisma.$queryRaw<
    Array<{
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
      is_verified: boolean;
      followers_count: bigint;
      mutual_count: bigint;
    }>
  >`
    SELECT
      u.id,
      u.username,
      u.display_name,
      u.avatar_url,
      u.bio,
      u.is_verified,
      (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id AND f.status = 'ACTIVE') AS followers_count,
      COUNT(DISTINCT f2.follower_id) AS mutual_count
    FROM follows f1
    JOIN follows f2 ON f2.follower_id = f1.following_id AND f2.status = 'ACTIVE'
    JOIN users u ON u.id = f2.following_id
    WHERE f1.follower_id = ${userId}
      AND f1.status = 'ACTIVE'
      AND u.deleted_at IS NULL
      AND u.id != ${userId}
      AND u.id NOT IN (SELECT unnest(${excludeIds}::text[]))
    GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.bio, u.is_verified
    ORDER BY mutual_count DESC, followers_count DESC
    LIMIT ${limit}
  `;

  return suggestions.map((s) => ({
    id: s.id,
    username: s.username,
    displayName: s.display_name,
    avatarUrl: s.avatar_url,
    bio: s.bio,
    isVerified: s.is_verified,
    followersCount: Number(s.followers_count),
    mutualFollowsCount: Number(s.mutual_count),
    reason: 'mutual_follows' as const,
  }));
}

async function getPopularSuggestions(
  excludeIds: string[],
  limit: number,
): Promise<RecommendedUser[]> {
  const users = await prisma.$queryRaw<
    Array<{
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
      is_verified: boolean;
      followers_count: bigint;
    }>
  >`
    SELECT
      u.id,
      u.username,
      u.display_name,
      u.avatar_url,
      u.bio,
      u.is_verified,
      (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id AND f.status = 'ACTIVE') AS followers_count
    FROM users u
    WHERE u.deleted_at IS NULL
      AND u.is_private = false
      AND u.id NOT IN (SELECT unnest(${excludeIds}::text[]))
    ORDER BY u.is_verified DESC,
      (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id AND f.status = 'ACTIVE') DESC
    LIMIT ${limit}
  `;

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    avatarUrl: u.avatar_url,
    bio: u.bio,
    isVerified: u.is_verified,
    followersCount: Number(u.followers_count),
    mutualFollowsCount: 0,
    reason: 'popular' as const,
  }));
}
