import { PrismaClient, UserRole, PostVisibility, NotificationType, SubscriptionStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.$transaction([
    prisma.moderationLog.deleteMany(),
    prisma.report.deleteMany(),
    prisma.postHashtag.deleteMany(),
    prisma.hashtag.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.bookmark.deleteMany(),
    prisma.like.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.block.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.post.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // ──────────────────────────────────────────────
  // Users
  // ──────────────────────────────────────────────

  const passwordHash = await hash('password123', 12);

  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      username: 'alice',
      passwordHash,
      displayName: 'Alice Johnson',
      bio: 'Full-stack developer. Coffee enthusiast. Building cool things.',
      avatarUrl: '/uploads/avatars/alice.jpg',
      isVerified: true,
      isPremium: true,
      role: UserRole.ADMIN,
      followerCount: 3,
      followingCount: 3,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          coverImageUrl: '/uploads/covers/alice-cover.jpg',
          website: 'https://alice.dev',
          location: 'San Francisco, CA',
          birthday: new Date('1992-03-15'),
        },
      },
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      username: 'bob_builder',
      passwordHash,
      displayName: 'Bob Smith',
      bio: 'Designer & photographer. Capturing moments, one pixel at a time.',
      avatarUrl: '/uploads/avatars/bob.jpg',
      isVerified: true,
      isPremium: true,
      role: UserRole.MODERATOR,
      followerCount: 3,
      followingCount: 2,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          coverImageUrl: '/uploads/covers/bob-cover.jpg',
          website: 'https://bobsmith.design',
          location: 'New York, NY',
          birthday: new Date('1990-07-22'),
        },
      },
    },
  });

  const carol = await prisma.user.create({
    data: {
      email: 'carol@example.com',
      username: 'carol_writes',
      passwordHash,
      displayName: 'Carol Lee',
      bio: 'Writer, bookworm, and aspiring novelist. Words are my superpower.',
      avatarUrl: '/uploads/avatars/carol.jpg',
      followerCount: 3,
      followingCount: 2,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          website: 'https://carolwrites.blog',
          location: 'Portland, OR',
        },
      },
    },
  });

  const dave = await prisma.user.create({
    data: {
      email: 'dave@example.com',
      username: 'dave_codes',
      passwordHash,
      displayName: 'Dave Park',
      bio: 'Open source contributor. Rust & TypeScript. Always learning.',
      avatarUrl: '/uploads/avatars/dave.jpg',
      followerCount: 1,
      followingCount: 3,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          website: 'https://github.com/davepark',
          location: 'Austin, TX',
          birthday: new Date('1995-11-08'),
        },
      },
    },
  });

  const eve = await prisma.user.create({
    data: {
      email: 'eve@example.com',
      username: 'eve_music',
      passwordHash,
      displayName: 'Eve Martinez',
      bio: 'Musician, producer, vinyl collector. Sound is everything.',
      followerCount: 0,
      followingCount: 0,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          location: 'Nashville, TN',
        },
      },
    },
  });

  console.log('Created users: alice, bob, carol, dave, eve');

  // ──────────────────────────────────────────────
  // Follows (no status field -- all follows are immediate in MVP)
  // ──────────────────────────────────────────────

  await prisma.follow.createMany({
    data: [
      { followerId: alice.id, followingId: bob.id },
      { followerId: alice.id, followingId: carol.id },
      { followerId: alice.id, followingId: dave.id },
      { followerId: bob.id, followingId: alice.id },
      { followerId: bob.id, followingId: carol.id },
      { followerId: carol.id, followingId: alice.id },
      { followerId: carol.id, followingId: bob.id },
      { followerId: dave.id, followingId: alice.id },
      { followerId: dave.id, followingId: bob.id },
      { followerId: dave.id, followingId: carol.id },
    ],
  });

  console.log('Created follow relationships');

  // ──────────────────────────────────────────────
  // Hashtags
  // ──────────────────────────────────────────────

  const hashtags = await Promise.all(
    [
      { name: 'webdev', postsCount: 3 },
      { name: 'photography', postsCount: 1 },
      { name: 'writing', postsCount: 2 },
      { name: 'opensource', postsCount: 2 },
      { name: 'music', postsCount: 1 },
      { name: 'typescript', postsCount: 2 },
      { name: 'design', postsCount: 1 },
      { name: 'startup', postsCount: 1 },
    ].map((h) => prisma.hashtag.create({ data: h }))
  );

  const hashtagMap = Object.fromEntries(hashtags.map((h) => [h.name, h.id]));

  console.log('Created hashtags');

  // ──────────────────────────────────────────────
  // Posts
  // ──────────────────────────────────────────────

  const post1 = await prisma.post.create({
    data: {
      content: 'Just shipped a new feature using Server Components in Next.js 14. The performance gains are incredible -- initial page load dropped by 40%. Highly recommend trying it out! #webdev #typescript',
      authorId: alice.id,
      likesCount: 3,
      commentsCount: 3,
      sharesCount: 0,
      postHashtags: {
        create: [
          { hashtagId: hashtagMap['webdev'] },
          { hashtagId: hashtagMap['typescript'] },
        ],
      },
    },
  });

  const post2 = await prisma.post.create({
    data: {
      content: 'Spent the morning at the Brooklyn Bridge. The light was perfect for golden hour shots. Sometimes you just need to slow down and observe. #photography #design',
      authorId: bob.id,
      mediaUrls: ['/uploads/media/brooklyn-1.jpg', '/uploads/media/brooklyn-2.jpg'],
      likesCount: 3,
      commentsCount: 2,
      sharesCount: 0,
      postHashtags: {
        create: [
          { hashtagId: hashtagMap['photography'] },
          { hashtagId: hashtagMap['design'] },
        ],
      },
    },
  });

  const post3 = await prisma.post.create({
    data: {
      content: "Finally finished the first draft of my novel! 87,000 words, 14 months of work. Now comes the hard part -- editing. Any tips from fellow writers? #writing",
      authorId: carol.id,
      likesCount: 3,
      commentsCount: 2,
      sharesCount: 0,
      postHashtags: {
        create: [{ hashtagId: hashtagMap['writing'] }],
      },
    },
  });

  const post4 = await prisma.post.create({
    data: {
      content: 'Released v2.0 of my open-source CLI tool today. New features: plugin system, config file support, and 3x faster execution. Check it out on GitHub! #opensource #typescript',
      authorId: dave.id,
      likesCount: 3,
      commentsCount: 1,
      sharesCount: 0,
      postHashtags: {
        create: [
          { hashtagId: hashtagMap['opensource'] },
          { hashtagId: hashtagMap['typescript'] },
        ],
      },
    },
  });

  const post5 = await prisma.post.create({
    data: {
      content: 'Hot take: the best way to learn a new framework is to build something real with it. Tutorials only get you so far. Ship something, break things, learn from the chaos. #webdev #startup',
      authorId: alice.id,
      likesCount: 3,
      commentsCount: 0,
      sharesCount: 1,
      postHashtags: {
        create: [
          { hashtagId: hashtagMap['webdev'] },
          { hashtagId: hashtagMap['startup'] },
        ],
      },
    },
  });

  const post6 = await prisma.post.create({
    data: {
      content: 'Contributed my first PR to a major open-source project today. The maintainers were incredibly welcoming. If you have been hesitant about contributing, just go for it! #opensource',
      authorId: carol.id,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      postHashtags: {
        create: [{ hashtagId: hashtagMap['opensource'] }],
      },
    },
  });

  const post7 = await prisma.post.create({
    data: {
      content: 'Exploring the intersection of code and music. Built a generative music tool with the Web Audio API. Every refresh creates a unique composition. #music #webdev',
      authorId: dave.id,
      likesCount: 2,
      commentsCount: 0,
      sharesCount: 0,
      postHashtags: {
        create: [
          { hashtagId: hashtagMap['music'] },
          { hashtagId: hashtagMap['webdev'] },
        ],
      },
    },
  });

  // Repost
  await prisma.post.create({
    data: {
      content: 'This is so true. Build first, optimize later.',
      authorId: dave.id,
      repostOfId: post5.id,
      sharesCount: 0,
    },
  });

  // Followers-only post
  await prisma.post.create({
    data: {
      content: 'Working on something exciting. Cannot share details yet, but stay tuned...',
      authorId: alice.id,
      visibility: PostVisibility.FOLLOWERS_ONLY,
      likesCount: 0,
      commentsCount: 0,
      postHashtags: {
        create: [{ hashtagId: hashtagMap['writing'] }],
      },
    },
  });

  console.log('Created posts');

  // ──────────────────────────────────────────────
  // Comments
  // ──────────────────────────────────────────────

  const comment1 = await prisma.comment.create({
    data: {
      content: 'Server Components are a game changer. Loved how you explained the perf wins!',
      authorId: bob.id,
      postId: post1.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Agreed! We saw similar results on our project.',
      authorId: dave.id,
      postId: post1.id,
      parentId: comment1.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'What was your caching strategy?',
      authorId: carol.id,
      postId: post1.id,
    },
  });

  const comment4 = await prisma.comment.create({
    data: {
      content: 'These photos are stunning! What camera/lens combo did you use?',
      authorId: alice.id,
      postId: post2.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Sony A7IV with the 24-70mm f/2.8 GM II. Golden hour does the heavy lifting though!',
      authorId: bob.id,
      postId: post2.id,
      parentId: comment4.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Congratulations! 87k words is no small feat. For editing, I recommend reading it aloud -- you catch so much that way.',
      authorId: alice.id,
      postId: post3.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Let it rest for at least two weeks before editing. Fresh eyes make all the difference.',
      authorId: bob.id,
      postId: post3.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'The plugin system looks fantastic. Any plans for a VS Code extension?',
      authorId: alice.id,
      postId: post4.id,
    },
  });

  console.log('Created comments');

  // ──────────────────────────────────────────────
  // Likes (post-only in MVP)
  // ──────────────────────────────────────────────

  await prisma.like.createMany({
    data: [
      { userId: bob.id, postId: post1.id },
      { userId: carol.id, postId: post1.id },
      { userId: dave.id, postId: post1.id },
      { userId: alice.id, postId: post2.id },
      { userId: carol.id, postId: post2.id },
      { userId: dave.id, postId: post2.id },
      { userId: alice.id, postId: post3.id },
      { userId: bob.id, postId: post3.id },
      { userId: dave.id, postId: post3.id },
      { userId: alice.id, postId: post4.id },
      { userId: bob.id, postId: post4.id },
      { userId: carol.id, postId: post4.id },
      { userId: bob.id, postId: post5.id },
      { userId: carol.id, postId: post5.id },
      { userId: dave.id, postId: post5.id },
      { userId: alice.id, postId: post7.id },
      { userId: bob.id, postId: post7.id },
    ],
  });

  console.log('Created likes');

  // ──────────────────────────────────────────────
  // Bookmarks
  // ──────────────────────────────────────────────

  await prisma.bookmark.createMany({
    data: [
      { userId: alice.id, postId: post3.id },
      { userId: bob.id, postId: post1.id },
      { userId: carol.id, postId: post4.id },
      { userId: dave.id, postId: post2.id },
    ],
  });

  console.log('Created bookmarks');

  // ──────────────────────────────────────────────
  // Notifications
  // ──────────────────────────────────────────────

  await prisma.notification.createMany({
    data: [
      {
        type: NotificationType.LIKE,
        recipientId: alice.id,
        actorId: bob.id,
        targetId: post1.id,
        targetType: 'post',
      },
      {
        type: NotificationType.COMMENT,
        recipientId: alice.id,
        actorId: bob.id,
        targetId: post1.id,
        targetType: 'post',
      },
      {
        type: NotificationType.FOLLOW,
        recipientId: alice.id,
        actorId: dave.id,
        targetId: dave.id,
        targetType: 'user',
        read: true,
      },
      {
        type: NotificationType.LIKE,
        recipientId: bob.id,
        actorId: alice.id,
        targetId: post2.id,
        targetType: 'post',
      },
      {
        type: NotificationType.COMMENT,
        recipientId: bob.id,
        actorId: alice.id,
        targetId: post2.id,
        targetType: 'post',
      },
      {
        type: NotificationType.LIKE,
        recipientId: carol.id,
        actorId: alice.id,
        targetId: post3.id,
        targetType: 'post',
      },
      {
        type: NotificationType.COMMENT,
        recipientId: carol.id,
        actorId: alice.id,
        targetId: post3.id,
        targetType: 'post',
      },
      {
        type: NotificationType.REPOST,
        recipientId: alice.id,
        actorId: dave.id,
        targetId: post5.id,
        targetType: 'post',
      },
    ],
  });

  console.log('Created notifications');

  // ──────────────────────────────────────────────
  // Subscriptions
  // ──────────────────────────────────────────────

  await prisma.subscription.create({
    data: {
      userId: alice.id,
      stripeCustomerId: 'cus_test_alice_001',
      stripeSubscriptionId: 'sub_test_alice_001',
      stripePriceId: 'price_premium_monthly',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(Date.now() - 86400000 * 15),
      currentPeriodEnd: new Date(Date.now() + 86400000 * 15),
    },
  });

  await prisma.subscription.create({
    data: {
      userId: bob.id,
      stripeCustomerId: 'cus_test_bob_001',
      stripeSubscriptionId: 'sub_test_bob_001',
      stripePriceId: 'price_premium_yearly',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(Date.now() - 86400000 * 30),
      currentPeriodEnd: new Date(Date.now() + 86400000 * 335),
    },
  });

  console.log('Created subscriptions');

  // ──────────────────────────────────────────────
  // Blocks
  // ──────────────────────────────────────────────

  await prisma.block.create({
    data: {
      blockerId: eve.id,
      blockedId: dave.id,
    },
  });

  console.log('Created blocks');

  // ──────────────────────────────────────────────
  // Reports
  // ──────────────────────────────────────────────

  await prisma.report.create({
    data: {
      reporterId: carol.id,
      targetType: 'post',
      targetId: post7.id,
      reason: 'SPAM',
      description: 'This post seems like self-promotion spam.',
      status: 'PENDING',
    },
  });

  console.log('Created reports');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
