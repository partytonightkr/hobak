// v1.1 FEATURE - Full-text search using PostgreSQL tsvector
// Not mounted in MVP; will be enabled when post/hashtag search ships.

import { prisma } from '../config/prisma';

interface SearchParams {
  query: string;
  type?: 'users' | 'posts' | 'hashtags' | 'all';
  limit?: number;
  offset?: number;
}

interface SearchResults {
  users: UserResult[];
  posts: PostResult[];
  hashtags: HashtagResult[];
}

interface UserResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  followersCount: number;
}

interface PostResult {
  id: string;
  content: string;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
}

interface HashtagResult {
  id: string;
  name: string;
  postsCount: number;
}

/**
 * Full-text search using PostgreSQL tsvector.
 * Falls back to ILIKE for simple substring matching when tsvector
 * is not configured on the database columns.
 */
export async function search(params: SearchParams): Promise<SearchResults> {
  const { query, type = 'all', limit = 20, offset = 0 } = params;
  const sanitized = query.trim();

  if (!sanitized) {
    return { users: [], posts: [], hashtags: [] };
  }

  const results: SearchResults = { users: [], posts: [], hashtags: [] };

  if (type === 'all' || type === 'users') {
    results.users = await searchUsers(sanitized, limit, offset);
  }

  if (type === 'all' || type === 'posts') {
    results.posts = await searchPosts(sanitized, limit, offset);
  }

  if (type === 'all' || type === 'hashtags') {
    results.hashtags = await searchHashtags(sanitized, limit, offset);
  }

  return results;
}

async function searchUsers(query: string, limit: number, offset: number): Promise<UserResult[]> {
  const likePattern = `%${query}%`;

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
      AND (
        u.username ILIKE ${likePattern}
        OR u.display_name ILIKE ${likePattern}
        OR u.bio ILIKE ${likePattern}
      )
    ORDER BY
      CASE WHEN u.username ILIKE ${query} THEN 0
           WHEN u.username ILIKE ${query + '%'} THEN 1
           ELSE 2
      END,
      u.is_verified DESC,
      (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id AND f.status = 'ACTIVE') DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    avatarUrl: u.avatar_url,
    bio: u.bio,
    isVerified: u.is_verified,
    followersCount: Number(u.followers_count),
  }));
}

async function searchPosts(query: string, limit: number, offset: number): Promise<PostResult[]> {
  const likePattern = `%${query}%`;

  const posts = await prisma.$queryRaw<
    Array<{
      id: string;
      content: string;
      created_at: Date;
      likes_count: number;
      comments_count: number;
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
      p.created_at,
      p.likes_count,
      p.comments_count,
      p.author_id,
      u.username AS author_username,
      u.display_name AS author_display_name,
      u.avatar_url AS author_avatar_url,
      u.is_verified AS author_is_verified
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.deleted_at IS NULL
      AND p.visibility = 'PUBLIC'
      AND (
        to_tsvector('english', p.content) @@ plainto_tsquery('english', ${query})
        OR p.content ILIKE ${likePattern}
      )
    ORDER BY
      ts_rank(to_tsvector('english', p.content), plainto_tsquery('english', ${query})) DESC,
      p.likes_count DESC,
      p.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return posts.map((p) => ({
    id: p.id,
    content: p.content,
    createdAt: p.created_at,
    likesCount: p.likes_count,
    commentsCount: p.comments_count,
    author: {
      id: p.author_id,
      username: p.author_username,
      displayName: p.author_display_name,
      avatarUrl: p.author_avatar_url,
      isVerified: p.author_is_verified,
    },
  }));
}

async function searchHashtags(query: string, limit: number, offset: number): Promise<HashtagResult[]> {
  const normalizedQuery = query.replace(/^#/, '').toLowerCase();

  const hashtags = await prisma.hashtag.findMany({
    where: {
      name: { contains: normalizedQuery, mode: 'insensitive' },
    },
    orderBy: [{ postsCount: 'desc' }, { name: 'asc' }],
    take: limit,
    skip: offset,
  });

  return hashtags.map((h) => ({
    id: h.id,
    name: h.name,
    postsCount: h.postsCount,
  }));
}

/**
 * Autocomplete suggestions for the search bar.
 * Returns quick matches for users and hashtags.
 */
export async function autocomplete(query: string, limit = 5) {
  const sanitized = query.trim();
  if (!sanitized || sanitized.length < 2) {
    return { users: [], hashtags: [] };
  }

  const [users, hashtags] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { username: { startsWith: sanitized, mode: 'insensitive' } },
          { displayName: { startsWith: sanitized, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isVerified: true,
      },
      orderBy: { isVerified: 'desc' },
      take: limit,
    }),
    prisma.hashtag.findMany({
      where: {
        name: { startsWith: sanitized.replace(/^#/, '').toLowerCase() },
      },
      orderBy: { postsCount: 'desc' },
      take: limit,
    }),
  ]);

  return { users, hashtags };
}
