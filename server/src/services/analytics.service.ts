import { prisma } from '../config/prisma';

interface ProfileAnalytics {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  followersCount: number;
  followingCount: number;
  engagementRate: number;
  postsByDay: DayCount[];
  likesByDay: DayCount[];
  followerGrowth: DayCount[];
  topPosts: TopPost[];
}

interface DayCount {
  date: string;
  count: number;
}

interface TopPost {
  id: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  engagementScore: number;
}

/**
 * Get comprehensive analytics for a user's profile.
 * Available to premium subscribers.
 */
export async function getProfileAnalytics(
  userId: string,
  days = 30,
): Promise<ProfileAnalytics> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [
    postStats,
    followerCounts,
    postsByDay,
    likesByDay,
    followerGrowth,
    topPosts,
  ] = await Promise.all([
    getPostStats(userId),
    getFollowerCounts(userId),
    getPostsByDay(userId, since),
    getLikesByDay(userId, since),
    getFollowerGrowthByDay(userId, since),
    getTopPosts(userId, 10),
  ]);

  const totalEngagements = postStats.totalLikes + postStats.totalComments + postStats.totalShares;
  const engagementRate =
    followerCounts.followers > 0 && postStats.totalPosts > 0
      ? (totalEngagements / (postStats.totalPosts * followerCounts.followers)) * 100
      : 0;

  return {
    totalPosts: postStats.totalPosts,
    totalLikes: postStats.totalLikes,
    totalComments: postStats.totalComments,
    totalShares: postStats.totalShares,
    followersCount: followerCounts.followers,
    followingCount: followerCounts.following,
    engagementRate: Math.round(engagementRate * 100) / 100,
    postsByDay,
    likesByDay,
    followerGrowth,
    topPosts,
  };
}

async function getPostStats(userId: string) {
  const result = await prisma.post.aggregate({
    where: { authorId: userId, deletedAt: null },
    _count: { id: true },
    _sum: {
      likesCount: true,
      commentsCount: true,
      sharesCount: true,
    },
  });

  return {
    totalPosts: result._count.id,
    totalLikes: result._sum.likesCount ?? 0,
    totalComments: result._sum.commentsCount ?? 0,
    totalShares: result._sum.sharesCount ?? 0,
  };
}

async function getFollowerCounts(userId: string) {
  const [followers, following] = await Promise.all([
    prisma.follow.count({
      where: { followingId: userId },
    }),
    prisma.follow.count({
      where: { followerId: userId },
    }),
  ]);

  return { followers, following };
}

async function getPostsByDay(userId: string, since: Date): Promise<DayCount[]> {
  const rows = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
    SELECT DATE(created_at) AS date, COUNT(*) AS count
    FROM posts
    WHERE author_id = ${userId}
      AND deleted_at IS NULL
      AND created_at >= ${since}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  return rows.map((r) => ({
    date: r.date.toISOString().split('T')[0],
    count: Number(r.count),
  }));
}

async function getLikesByDay(userId: string, since: Date): Promise<DayCount[]> {
  const rows = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
    SELECT DATE(l.created_at) AS date, COUNT(*) AS count
    FROM likes l
    JOIN posts p ON p.id = l.post_id
    WHERE p.author_id = ${userId}
      AND l.created_at >= ${since}
    GROUP BY DATE(l.created_at)
    ORDER BY date ASC
  `;

  return rows.map((r) => ({
    date: r.date.toISOString().split('T')[0],
    count: Number(r.count),
  }));
}

async function getFollowerGrowthByDay(userId: string, since: Date): Promise<DayCount[]> {
  const rows = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
    SELECT DATE(created_at) AS date, COUNT(*) AS count
    FROM follows
    WHERE following_id = ${userId}
      AND status = 'ACTIVE'
      AND created_at >= ${since}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  return rows.map((r) => ({
    date: r.date.toISOString().split('T')[0],
    count: Number(r.count),
  }));
}

async function getTopPosts(userId: string, limit: number): Promise<TopPost[]> {
  const posts = await prisma.post.findMany({
    where: { authorId: userId, deletedAt: null },
    select: {
      id: true,
      content: true,
      likesCount: true,
      commentsCount: true,
      sharesCount: true,
      createdAt: true,
    },
    orderBy: [
      { likesCount: 'desc' },
      { commentsCount: 'desc' },
    ],
    take: limit,
  });

  return posts.map((p) => ({
    ...p,
    engagementScore: p.likesCount + p.commentsCount * 2 + p.sharesCount * 3,
  }));
}

/**
 * Get post reach estimate (simplified).
 * In production, you'd track impressions separately.
 * This estimates based on follower count at time of posting.
 */
export async function getPostAnalytics(postId: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId, authorId: userId },
    select: {
      id: true,
      content: true,
      likesCount: true,
      commentsCount: true,
      sharesCount: true,
      createdAt: true,
    },
  });

  if (!post) return null;

  const followerCount = await prisma.follow.count({
    where: { followingId: userId },
  });

  const estimatedReach = followerCount + post.sharesCount * 10;
  const engagements = post.likesCount + post.commentsCount + post.sharesCount;
  const engagementRate = estimatedReach > 0 ? (engagements / estimatedReach) * 100 : 0;

  return {
    ...post,
    estimatedReach,
    engagementRate: Math.round(engagementRate * 100) / 100,
    engagements,
  };
}
