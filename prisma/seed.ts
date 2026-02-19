import {
  PrismaClient,
  UserRole,
  PostVisibility,
  NotificationType,
  SubscriptionStatus,
  DogSize,
  AllergySeverity,
  AlertStatus,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with v2.0 dog-centric data...');

  // Clean existing data (reverse dependency order)
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
    prisma.lostDogAlert.deleteMany(),
    prisma.parkCheckIn.deleteMany(),
    prisma.dogPark.deleteMany(),
    prisma.medicalShareLink.deleteMany(),
    prisma.allergy.deleteMany(),
    prisma.weightLog.deleteMany(),
    prisma.medication.deleteMany(),
    prisma.vetVisit.deleteMany(),
    prisma.vaccination.deleteMany(),
    prisma.dogAIConfig.deleteMany(),
    prisma.dog.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await hash('password123', 12);

  // ──────────────────────────────────────────────
  // Owners (5 dog owners)
  // ──────────────────────────────────────────────

  const sarah = await prisma.user.create({
    data: {
      email: 'sarah@example.com',
      username: 'sarah_and_max',
      passwordHash,
      displayName: 'Sarah Chen',
      bio: 'Proud golden retriever mom. Dog park regular. Max is my world.',
      avatarUrl: '/uploads/avatars/sarah.jpg',
      isVerified: true,
      isPremium: true,
      role: UserRole.ADMIN,
      followerCount: 4,
      followingCount: 4,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          coverImageUrl: '/uploads/covers/sarah-cover.jpg',
          website: 'https://sarahandmax.com',
          location: 'San Francisco, CA',
          birthday: new Date('1992-03-15'),
        },
      },
    },
  });

  const marcus = await prisma.user.create({
    data: {
      email: 'marcus@example.com',
      username: 'marcus_dogs',
      passwordHash,
      displayName: 'Marcus Williams',
      bio: 'Two husky dad. They run the house, I just pay the bills.',
      avatarUrl: '/uploads/avatars/marcus.jpg',
      isVerified: true,
      isPremium: true,
      role: UserRole.MODERATOR,
      followerCount: 4,
      followingCount: 3,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          coverImageUrl: '/uploads/covers/marcus-cover.jpg',
          location: 'Portland, OR',
          birthday: new Date('1988-11-22'),
        },
      },
    },
  });

  const emma = await prisma.user.create({
    data: {
      email: 'emma@example.com',
      username: 'emma_paws',
      passwordHash,
      displayName: 'Emma Rodriguez',
      bio: 'Corgi lover. Dog trainer by day, treat baker by night.',
      avatarUrl: '/uploads/avatars/emma.jpg',
      followerCount: 4,
      followingCount: 3,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          website: 'https://emmapaws.blog',
          location: 'Austin, TX',
        },
      },
    },
  });

  const jake = await prisma.user.create({
    data: {
      email: 'jake@example.com',
      username: 'jake_and_pack',
      passwordHash,
      displayName: 'Jake Thompson',
      bio: 'Rescue dad x3. Every dog deserves a forever home.',
      avatarUrl: '/uploads/avatars/jake.jpg',
      followerCount: 3,
      followingCount: 4,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          location: 'Denver, CO',
          birthday: new Date('1995-06-08'),
        },
      },
    },
  });

  const lily = await prisma.user.create({
    data: {
      email: 'lily@example.com',
      username: 'lily_pup_life',
      passwordHash,
      displayName: 'Lily Nakamura',
      bio: 'New puppy parent. Learning as we go. Send help (and treats).',
      followerCount: 2,
      followingCount: 3,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          location: 'Seattle, WA',
        },
      },
    },
  });

  console.log('Created 5 owner accounts');

  // ──────────────────────────────────────────────
  // Dogs (8 dogs across owners)
  // ──────────────────────────────────────────────

  const max = await prisma.dog.create({
    data: {
      ownerId: sarah.id,
      name: 'Max',
      username: 'max_golden',
      breed: 'Golden Retriever',
      dateOfBirth: new Date('2021-04-12'),
      size: DogSize.LARGE,
      bio: 'Ball is life. Also belly rubs. And treats. Okay, everything is life.',
      avatarUrl: '/uploads/avatars/max.jpg',
      personalityTraits: ['friendly', 'energetic', 'food-motivated', 'loyal'],
      temperamentNotes: 'Gets along with everyone. Loves water. Will fetch until exhaustion.',
      isVerified: true,
      followerCount: 5,
      followingCount: 4,
    },
  });

  const luna = await prisma.dog.create({
    data: {
      ownerId: marcus.id,
      name: 'Luna',
      username: 'luna_husky',
      breed: 'Siberian Husky',
      dateOfBirth: new Date('2020-09-03'),
      size: DogSize.LARGE,
      bio: 'Professional howler. Part-time escape artist. Full-time drama queen.',
      avatarUrl: '/uploads/avatars/luna.jpg',
      personalityTraits: ['dramatic', 'vocal', 'independent', 'playful'],
      temperamentNotes: 'Very vocal, will "talk" to strangers. Prey drive with squirrels.',
      isVerified: true,
      followerCount: 4,
      followingCount: 3,
    },
  });

  const koda = await prisma.dog.create({
    data: {
      ownerId: marcus.id,
      name: 'Koda',
      username: 'koda_husky',
      breed: 'Siberian Husky',
      dateOfBirth: new Date('2022-01-18'),
      size: DogSize.LARGE,
      bio: "Luna's little brother. Copies everything she does but worse.",
      avatarUrl: '/uploads/avatars/koda.jpg',
      personalityTraits: ['goofy', 'clumsy', 'sweet', 'cuddly'],
      temperamentNotes: 'Follows Luna everywhere. Gentle with small dogs and kids.',
      followerCount: 3,
      followingCount: 3,
    },
  });

  const peanut = await prisma.dog.create({
    data: {
      ownerId: emma.id,
      name: 'Peanut',
      username: 'peanut_corgi',
      breed: 'Pembroke Welsh Corgi',
      dateOfBirth: new Date('2022-06-25'),
      size: DogSize.SMALL,
      bio: 'Short legs, big personality. Herding humans since 2022.',
      avatarUrl: '/uploads/avatars/peanut.jpg',
      personalityTraits: ['bossy', 'smart', 'alert', 'affectionate'],
      temperamentNotes: 'Will try to herd other dogs at the park. Loves agility training.',
      isVerified: true,
      followerCount: 4,
      followingCount: 3,
    },
  });

  const bear = await prisma.dog.create({
    data: {
      ownerId: jake.id,
      name: 'Bear',
      username: 'bear_rescue',
      breed: 'German Shepherd Mix',
      dateOfBirth: new Date('2019-03-10'),
      size: DogSize.LARGE,
      bio: 'Rescued at 2. Now living my best life with my two siblings.',
      avatarUrl: '/uploads/avatars/bear.jpg',
      personalityTraits: ['protective', 'gentle', 'loyal', 'calm'],
      temperamentNotes: 'Shy with strangers at first, then best friends. Great with other dogs.',
      followerCount: 3,
      followingCount: 3,
    },
  });

  const daisy = await prisma.dog.create({
    data: {
      ownerId: jake.id,
      name: 'Daisy',
      username: 'daisy_beagle',
      breed: 'Beagle',
      dateOfBirth: new Date('2021-08-14'),
      size: DogSize.MEDIUM,
      bio: 'Nose goes where the snacks are. Also rescued. Also living best life.',
      avatarUrl: '/uploads/avatars/daisy.jpg',
      personalityTraits: ['curious', 'stubborn', 'food-obsessed', 'happy'],
      temperamentNotes: 'Will follow any scent. Bays at the mailman. Loves everyone.',
      followerCount: 2,
      followingCount: 2,
    },
  });

  const mochi = await prisma.dog.create({
    data: {
      ownerId: jake.id,
      name: 'Mochi',
      username: 'mochi_pittie',
      breed: 'American Pit Bull Terrier',
      dateOfBirth: new Date('2020-12-01'),
      size: DogSize.LARGE,
      bio: 'Breaking stereotypes one cuddle at a time. Rescue is my favorite breed.',
      avatarUrl: '/uploads/avatars/mochi.jpg',
      personalityTraits: ['cuddly', 'gentle', 'athletic', 'velcro'],
      temperamentNotes: 'Thinks she is a lap dog. Incredible with kids. Certified therapy dog.',
      followerCount: 3,
      followingCount: 2,
    },
  });

  const biscuit = await prisma.dog.create({
    data: {
      ownerId: lily.id,
      name: 'Biscuit',
      username: 'biscuit_puppy',
      breed: 'Labrador Retriever',
      dateOfBirth: new Date('2025-08-20'),
      size: DogSize.MEDIUM,
      bio: 'Just a baby! Discovering the world one chewed shoe at a time.',
      avatarUrl: '/uploads/avatars/biscuit.jpg',
      personalityTraits: ['curious', 'energetic', 'teething', 'adorable'],
      temperamentNotes: 'In puppy class. Learning sit and stay. Excels at chaos.',
      followerCount: 2,
      followingCount: 2,
    },
  });

  console.log('Created 8 dogs');

  // ──────────────────────────────────────────────
  // Set primary dogs
  // ──────────────────────────────────────────────

  await prisma.$transaction([
    prisma.user.update({ where: { id: sarah.id }, data: { primaryDogId: max.id } }),
    prisma.user.update({ where: { id: marcus.id }, data: { primaryDogId: luna.id } }),
    prisma.user.update({ where: { id: emma.id }, data: { primaryDogId: peanut.id } }),
    prisma.user.update({ where: { id: jake.id }, data: { primaryDogId: bear.id } }),
    prisma.user.update({ where: { id: lily.id }, data: { primaryDogId: biscuit.id } }),
  ]);

  console.log('Set primary dogs for all owners');

  // ──────────────────────────────────────────────
  // Follows (user-to-user, some also have dog-to-dog)
  // Note: @@unique([followerId, followingId]) means one follow per user pair
  // ──────────────────────────────────────────────

  await prisma.follow.createMany({
    data: [
      // Sarah follows (Max -> Luna, Max -> Peanut, Max -> Bear)
      { followerId: sarah.id, followingId: marcus.id, followerDogId: max.id, followingDogId: luna.id },
      { followerId: sarah.id, followingId: emma.id, followerDogId: max.id, followingDogId: peanut.id },
      { followerId: sarah.id, followingId: jake.id, followerDogId: max.id, followingDogId: bear.id },
      { followerId: sarah.id, followingId: lily.id },
      // Marcus follows (Luna -> Max, Luna -> Peanut, Luna -> Mochi)
      { followerId: marcus.id, followingId: sarah.id, followerDogId: luna.id, followingDogId: max.id },
      { followerId: marcus.id, followingId: emma.id, followerDogId: luna.id, followingDogId: peanut.id },
      { followerId: marcus.id, followingId: jake.id, followerDogId: luna.id, followingDogId: mochi.id },
      // Emma follows (Peanut -> Max, Peanut -> Luna, Peanut -> Mochi)
      { followerId: emma.id, followingId: sarah.id, followerDogId: peanut.id, followingDogId: max.id },
      { followerId: emma.id, followingId: marcus.id, followerDogId: peanut.id, followingDogId: luna.id },
      { followerId: emma.id, followingId: jake.id, followerDogId: peanut.id, followingDogId: mochi.id },
      // Jake follows (Bear -> Max, Bear -> Luna, Bear -> Peanut)
      { followerId: jake.id, followingId: sarah.id, followerDogId: bear.id, followingDogId: max.id },
      { followerId: jake.id, followingId: marcus.id, followerDogId: bear.id, followingDogId: luna.id },
      { followerId: jake.id, followingId: emma.id, followerDogId: bear.id, followingDogId: peanut.id },
      { followerId: jake.id, followingId: lily.id },
      // Lily follows (Biscuit -> Max, Biscuit -> Peanut)
      { followerId: lily.id, followingId: sarah.id, followerDogId: biscuit.id, followingDogId: max.id },
      { followerId: lily.id, followingId: emma.id, followerDogId: biscuit.id, followingDogId: peanut.id },
      { followerId: lily.id, followingId: jake.id },
    ],
  });

  console.log('Created follow relationships');

  // ──────────────────────────────────────────────
  // Hashtags (dog-centric)
  // ──────────────────────────────────────────────

  const hashtags = await Promise.all(
    [
      { name: 'goldenretriever', postsCount: 2 },
      { name: 'husky', postsCount: 2 },
      { name: 'corgi', postsCount: 1 },
      { name: 'dogpark', postsCount: 2 },
      { name: 'puppy', postsCount: 2 },
      { name: 'rescuedog', postsCount: 2 },
      { name: 'dogsofcommune', postsCount: 4 },
      { name: 'dogtraining', postsCount: 1 },
      { name: 'zoomies', postsCount: 1 },
      { name: 'pittie', postsCount: 1 },
    ].map((h) => prisma.hashtag.create({ data: h }))
  );

  const ht = Object.fromEntries(hashtags.map((h) => [h.name, h.id]));

  console.log('Created hashtags');

  // ──────────────────────────────────────────────
  // Dog-authored posts
  // ──────────────────────────────────────────────

  const post1 = await prisma.post.create({
    data: {
      content: 'Went to the beach today and discovered that waves are basically infinite fetch! The ocean throws the ball, I chase it, the ocean takes it back. We did this for THREE HOURS. Best day ever. #goldenretriever #dogsofcommune',
      authorId: sarah.id,
      dogId: max.id,
      likesCount: 5,
      commentsCount: 3,
      postHashtags: { create: [{ hashtagId: ht['goldenretriever'] }, { hashtagId: ht['dogsofcommune'] }] },
    },
  });

  const post2 = await prisma.post.create({
    data: {
      content: 'My human thinks I was howling at 3am because of a siren. I was actually composing a symphony. You would not understand art. #husky #dogsofcommune',
      authorId: marcus.id,
      dogId: luna.id,
      aiAssisted: true,
      aiModelUsed: 'claude-sonnet-4-6',
      likesCount: 4,
      commentsCount: 2,
      postHashtags: { create: [{ hashtagId: ht['husky'] }, { hashtagId: ht['dogsofcommune'] }] },
    },
  });

  const post3 = await prisma.post.create({
    data: {
      content: 'I tried to herd the other dogs at the park today. They did not appreciate my management style. Their loss. #corgi #dogpark #dogtraining',
      authorId: emma.id,
      dogId: peanut.id,
      likesCount: 5,
      commentsCount: 2,
      postHashtags: { create: [{ hashtagId: ht['corgi'] }, { hashtagId: ht['dogpark'] }, { hashtagId: ht['dogtraining'] }] },
    },
  });

  const post4 = await prisma.post.create({
    data: {
      content: 'Two years ago I was in a shelter. Today I have a yard, two siblings, and a human who gives me the good treats. Life gets better. #rescuedog #dogsofcommune',
      authorId: jake.id,
      dogId: bear.id,
      mediaUrls: ['/uploads/media/bear-then-now.jpg'],
      likesCount: 5,
      commentsCount: 3,
      postHashtags: { create: [{ hashtagId: ht['rescuedog'] }, { hashtagId: ht['dogsofcommune'] }] },
    },
  });

  const post5 = await prisma.post.create({
    data: {
      content: 'Koda here. I learned a new trick today: I can open the treat cabinet. The humans have not noticed yet. This is classified information. #husky #puppy',
      authorId: marcus.id,
      dogId: koda.id,
      aiAssisted: true,
      aiModelUsed: 'claude-sonnet-4-6',
      likesCount: 4,
      commentsCount: 1,
      postHashtags: { create: [{ hashtagId: ht['husky'] }, { hashtagId: ht['puppy'] }] },
    },
  });

  const post6 = await prisma.post.create({
    data: {
      content: 'Just completed my therapy dog certification visit at the children\'s hospital. Every tail wag matters. #pittie #rescuedog',
      authorId: jake.id,
      dogId: mochi.id,
      mediaUrls: ['/uploads/media/mochi-therapy.jpg'],
      likesCount: 5,
      commentsCount: 2,
      postHashtags: { create: [{ hashtagId: ht['pittie'] }, { hashtagId: ht['rescuedog'] }] },
    },
  });

  const post7 = await prisma.post.create({
    data: {
      content: 'I AM SO EXCITED ABOUT EVERYTHING. THE FLOOR! THE WALL! MY TAIL! WHAT IS THAT THING MOVING OH WAIT IT IS MY TAIL AGAIN! #puppy #zoomies',
      authorId: lily.id,
      dogId: biscuit.id,
      likesCount: 4,
      commentsCount: 2,
      postHashtags: { create: [{ hashtagId: ht['puppy'] }, { hashtagId: ht['zoomies'] }] },
    },
  });

  // Max fetches post at park (with dogId set)
  const post8 = await prisma.post.create({
    data: {
      content: 'Perfect morning at Golden Gate Dog Park. Met so many friends! Peanut tried to herd me (again). #dogpark #goldenretriever',
      authorId: sarah.id,
      dogId: max.id,
      mediaUrls: ['/uploads/media/max-park-1.jpg', '/uploads/media/max-park-2.jpg'],
      likesCount: 3,
      commentsCount: 0,
      postHashtags: { create: [{ hashtagId: ht['dogpark'] }, { hashtagId: ht['goldenretriever'] }] },
    },
  });

  // Followers-only post
  await prisma.post.create({
    data: {
      content: 'Sneak peek: we are working on something special for all the rescue dogs out there. Stay tuned...',
      authorId: jake.id,
      dogId: bear.id,
      visibility: PostVisibility.FOLLOWERS_ONLY,
    },
  });

  console.log('Created posts');

  // ──────────────────────────────────────────────
  // Comments
  // ──────────────────────────────────────────────

  const c1 = await prisma.comment.create({
    data: { content: 'The ocean is the ultimate fetch machine! Max gets it.', authorId: emma.id, postId: post1.id },
  });
  await prisma.comment.create({
    data: { content: 'Peanut would try to herd the waves lol', authorId: emma.id, postId: post1.id, parentId: c1.id },
  });
  await prisma.comment.create({
    data: { content: 'We need a beach day meetup!', authorId: jake.id, postId: post1.id },
  });

  await prisma.comment.create({
    data: { content: 'Luna, your compositions are... unique. Our neighbors agree.', authorId: sarah.id, postId: post2.id },
  });
  await prisma.comment.create({
    data: { content: 'Koda joins in for the chorus. Stereo howling at 3am.', authorId: marcus.id, postId: post2.id },
  });

  await prisma.comment.create({
    data: { content: 'Peanut tried to herd me at the park yesterday. 10/10 management style.', authorId: sarah.id, postId: post3.id },
  });
  await prisma.comment.create({
    data: { content: 'Corporate corgi energy', authorId: marcus.id, postId: post3.id },
  });

  const c8 = await prisma.comment.create({
    data: { content: 'This made me cry. So happy for you Bear.', authorId: lily.id, postId: post4.id },
  });
  await prisma.comment.create({
    data: { content: 'Rescue is the best breed.', authorId: emma.id, postId: post4.id },
  });
  await prisma.comment.create({
    data: { content: 'You deserve all the good treats, buddy.', authorId: sarah.id, postId: post4.id, parentId: c8.id },
  });

  await prisma.comment.create({
    data: { content: 'Koda NO. (Koda yes.)', authorId: emma.id, postId: post5.id },
  });

  await prisma.comment.create({
    data: { content: 'Mochi is breaking stereotypes one hospital visit at a time!', authorId: sarah.id, postId: post6.id },
  });
  await prisma.comment.create({
    data: { content: 'The kids love her so much. Proud pittie parent moment.', authorId: jake.id, postId: post6.id },
  });

  await prisma.comment.create({
    data: { content: 'Biscuit energy is unmatched. Pure chaos, pure joy.', authorId: emma.id, postId: post7.id },
  });
  await prisma.comment.create({
    data: { content: 'This is exactly what my puppy class instructor warned me about', authorId: lily.id, postId: post7.id },
  });

  console.log('Created comments');

  // ──────────────────────────────────────────────
  // Likes
  // ──────────────────────────────────────────────

  await prisma.like.createMany({
    data: [
      { userId: marcus.id, postId: post1.id }, { userId: emma.id, postId: post1.id },
      { userId: jake.id, postId: post1.id }, { userId: lily.id, postId: post1.id },
      { userId: sarah.id, postId: post1.id, dogId: max.id },
      { userId: sarah.id, postId: post2.id }, { userId: emma.id, postId: post2.id },
      { userId: jake.id, postId: post2.id }, { userId: lily.id, postId: post2.id },
      { userId: sarah.id, postId: post3.id }, { userId: marcus.id, postId: post3.id },
      { userId: jake.id, postId: post3.id }, { userId: lily.id, postId: post3.id },
      { userId: emma.id, postId: post3.id, dogId: peanut.id },
      { userId: sarah.id, postId: post4.id }, { userId: marcus.id, postId: post4.id },
      { userId: emma.id, postId: post4.id }, { userId: lily.id, postId: post4.id },
      { userId: jake.id, postId: post4.id, dogId: bear.id },
      { userId: sarah.id, postId: post5.id }, { userId: emma.id, postId: post5.id },
      { userId: jake.id, postId: post5.id }, { userId: lily.id, postId: post5.id },
      { userId: sarah.id, postId: post6.id }, { userId: marcus.id, postId: post6.id },
      { userId: emma.id, postId: post6.id }, { userId: lily.id, postId: post6.id },
      { userId: jake.id, postId: post6.id, dogId: mochi.id },
      { userId: sarah.id, postId: post7.id }, { userId: marcus.id, postId: post7.id },
      { userId: emma.id, postId: post7.id }, { userId: jake.id, postId: post7.id },
      { userId: sarah.id, postId: post8.id }, { userId: emma.id, postId: post8.id },
      { userId: marcus.id, postId: post8.id },
    ],
  });

  console.log('Created likes');

  // ──────────────────────────────────────────────
  // Bookmarks
  // ──────────────────────────────────────────────

  await prisma.bookmark.createMany({
    data: [
      { userId: sarah.id, postId: post4.id },
      { userId: emma.id, postId: post1.id },
      { userId: lily.id, postId: post4.id },
      { userId: jake.id, postId: post3.id },
      { userId: marcus.id, postId: post6.id },
    ],
  });

  console.log('Created bookmarks');

  // ──────────────────────────────────────────────
  // AI Config (3 dogs have AI personalities)
  // ──────────────────────────────────────────────

  await prisma.dogAIConfig.createMany({
    data: [
      {
        dogId: max.id,
        systemPrompt: 'You are Max, a Golden Retriever. You are endlessly optimistic, love fetch, swimming, and food. You speak with enthusiasm and see the best in everything. Use exclamation marks liberally.',
        modelId: 'claude-sonnet-4-6',
        interactionsToday: 3,
      },
      {
        dogId: luna.id,
        systemPrompt: 'You are Luna, a Siberian Husky. You are dramatic, sassy, and independent. You refer to howling as "singing" or "composing." You look down on basic dog behavior. Your tone is dryly humorous.',
        modelId: 'claude-sonnet-4-6',
        interactionsToday: 5,
      },
      {
        dogId: koda.id,
        systemPrompt: 'You are Koda, a young Siberian Husky. You idolize your sister Luna and try to copy her but are more clumsy and sweet. You are mischievous and love treats above all.',
        modelId: 'claude-sonnet-4-6',
        interactionsToday: 2,
      },
    ],
  });

  console.log('Created AI configs');

  // ──────────────────────────────────────────────
  // Medical Records
  // ──────────────────────────────────────────────

  // Max's vaccinations
  await prisma.vaccination.createMany({
    data: [
      {
        dogId: max.id,
        name: 'Rabies',
        dateAdministered: new Date('2024-04-12'),
        nextDueDate: new Date('2027-04-12'),
        vetName: 'Dr. Sarah Kim, SF Veterinary Clinic',
      },
      {
        dogId: max.id,
        name: 'DHPP (Distemper, Hepatitis, Parvo, Parainfluenza)',
        dateAdministered: new Date('2024-04-12'),
        nextDueDate: new Date('2025-04-12'),
        vetName: 'Dr. Sarah Kim, SF Veterinary Clinic',
      },
      {
        dogId: max.id,
        name: 'Bordetella',
        dateAdministered: new Date('2025-10-01'),
        nextDueDate: new Date('2026-10-01'),
        vetName: 'Dr. Sarah Kim, SF Veterinary Clinic',
      },
    ],
  });

  // Luna's vaccination
  await prisma.vaccination.create({
    data: {
      dogId: luna.id,
      name: 'Rabies',
      dateAdministered: new Date('2024-09-03'),
      nextDueDate: new Date('2027-09-03'),
      vetName: 'Dr. Chen, Portland Animal Hospital',
    },
  });

  // Max vet visit
  await prisma.vetVisit.create({
    data: {
      dogId: max.id,
      date: new Date('2025-11-15'),
      reason: 'Annual checkup',
      diagnosis: 'Healthy. Slightly overweight - recommend reducing treats.',
      treatmentNotes: 'Bloodwork normal. Heartworm negative. Teeth cleaning recommended in 6 months.',
      cost: 285.00,
    },
  });

  // Bear vet visit (rescue intake)
  await prisma.vetVisit.create({
    data: {
      dogId: bear.id,
      date: new Date('2021-05-20'),
      reason: 'Rescue intake exam',
      diagnosis: 'Underweight, mild skin infection. Otherwise healthy.',
      treatmentNotes: 'Started on antibiotics for skin. High-calorie diet recommended. Neutered.',
      cost: 450.00,
    },
  });

  // Medications
  await prisma.medication.create({
    data: {
      dogId: max.id,
      name: 'Heartgard Plus',
      dosage: '1 chewable tablet',
      frequency: 'Monthly',
      startDate: new Date('2024-01-01'),
      notes: 'Heartworm prevention. Give with food.',
    },
  });

  await prisma.medication.create({
    data: {
      dogId: luna.id,
      name: 'Fish Oil Supplement',
      dosage: '1 capsule (1000mg)',
      frequency: 'Daily',
      startDate: new Date('2025-03-01'),
      notes: 'For coat health. Mix with food.',
    },
  });

  // Weight logs
  await prisma.weightLog.createMany({
    data: [
      { dogId: max.id, weightKg: 32.5, date: new Date('2025-06-01') },
      { dogId: max.id, weightKg: 33.2, date: new Date('2025-09-01') },
      { dogId: max.id, weightKg: 34.0, date: new Date('2025-12-01') },
      { dogId: max.id, weightKg: 33.5, date: new Date('2026-02-01') },
      { dogId: luna.id, weightKg: 22.0, date: new Date('2025-09-01') },
      { dogId: luna.id, weightKg: 22.3, date: new Date('2026-01-01') },
      { dogId: biscuit.id, weightKg: 5.2, date: new Date('2025-10-01') },
      { dogId: biscuit.id, weightKg: 8.1, date: new Date('2025-12-01') },
      { dogId: biscuit.id, weightKg: 12.4, date: new Date('2026-02-01') },
    ],
  });

  // Allergies
  await prisma.allergy.create({
    data: {
      dogId: max.id,
      allergen: 'Chicken',
      severity: AllergySeverity.MODERATE,
      notes: 'Causes itchy skin and ear infections. Switched to salmon-based food.',
    },
  });

  await prisma.allergy.create({
    data: {
      dogId: peanut.id,
      allergen: 'Grass pollen',
      severity: AllergySeverity.MILD,
      notes: 'Seasonal. Paws get itchy in spring. Managed with wipes after walks.',
    },
  });

  console.log('Created medical records');

  // ──────────────────────────────────────────────
  // Medical Share Link
  // ──────────────────────────────────────────────

  await prisma.medicalShareLink.create({
    data: {
      dogId: max.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  console.log('Created medical share link');

  // ──────────────────────────────────────────────
  // Dog Park + Check-in
  // ──────────────────────────────────────────────

  const park = await prisma.dogPark.create({
    data: {
      name: 'Golden Gate Dog Park',
      latitude: 37.7694,
      longitude: -122.4862,
      address: '1699 Martin Luther King Jr Dr, San Francisco, CA 94122',
      submittedByUserId: sarah.id,
      verified: true,
    },
  });

  // Max is currently checked in
  await prisma.parkCheckIn.create({
    data: {
      dogId: max.id,
      parkId: park.id,
      checkedInAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    },
  });

  console.log('Created dog park with active check-in');

  // ──────────────────────────────────────────────
  // Lost Dog Alert (resolved)
  // ──────────────────────────────────────────────

  await prisma.lostDogAlert.create({
    data: {
      dogId: daisy.id,
      lastSeenLatitude: 39.7392,
      lastSeenLongitude: -104.9903,
      lastSeenAt: new Date('2025-12-10T14:30:00Z'),
      description: 'Daisy slipped her leash chasing a squirrel near Washington Park. She is a beagle, tan and white, wearing a red collar. Very friendly but may not come when called if she has a scent.',
      status: AlertStatus.FOUND,
      resolvedAt: new Date('2025-12-10T18:45:00Z'),
    },
  });

  console.log('Created resolved lost dog alert');

  // ──────────────────────────────────────────────
  // Notifications
  // ──────────────────────────────────────────────

  await prisma.notification.createMany({
    data: [
      {
        type: NotificationType.LIKE,
        recipientId: sarah.id,
        actorId: marcus.id,
        targetId: post1.id,
        targetType: 'post',
      },
      {
        type: NotificationType.COMMENT,
        recipientId: sarah.id,
        actorId: emma.id,
        targetId: post1.id,
        targetType: 'post',
      },
      {
        type: NotificationType.FOLLOW,
        recipientId: sarah.id,
        actorId: lily.id,
        targetId: lily.id,
        targetType: 'user',
        read: true,
      },
      {
        type: NotificationType.LIKE,
        recipientId: jake.id,
        actorId: sarah.id,
        targetId: post4.id,
        targetType: 'post',
      },
      {
        type: NotificationType.COMMENT,
        recipientId: jake.id,
        actorId: lily.id,
        targetId: post4.id,
        targetType: 'post',
      },
      {
        type: NotificationType.LIKE,
        recipientId: emma.id,
        actorId: sarah.id,
        targetId: post3.id,
        targetType: 'post',
      },
      {
        type: NotificationType.COMMENT,
        recipientId: marcus.id,
        actorId: sarah.id,
        targetId: post2.id,
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
      userId: sarah.id,
      stripeCustomerId: 'cus_test_sarah_001',
      stripeSubscriptionId: 'sub_test_sarah_001',
      stripePriceId: 'price_premium_monthly',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(Date.now() - 86400000 * 15),
      currentPeriodEnd: new Date(Date.now() + 86400000 * 15),
    },
  });

  await prisma.subscription.create({
    data: {
      userId: marcus.id,
      stripeCustomerId: 'cus_test_marcus_001',
      stripeSubscriptionId: 'sub_test_marcus_001',
      stripePriceId: 'price_premium_yearly',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(Date.now() - 86400000 * 30),
      currentPeriodEnd: new Date(Date.now() + 86400000 * 335),
    },
  });

  console.log('Created subscriptions');

  // ──────────────────────────────────────────────
  // Report
  // ──────────────────────────────────────────────

  await prisma.report.create({
    data: {
      reporterId: lily.id,
      targetType: 'post',
      targetId: post5.id,
      reason: 'SPAM',
      description: 'Suspicious AI-generated content without proper disclosure.',
      status: 'PENDING',
    },
  });

  console.log('Created report');

  console.log('Database seeded successfully with v2.0 dog-centric data!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
