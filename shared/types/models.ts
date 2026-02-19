// Shared data model types used in API responses
// These represent the shape of data as returned by the backend API

import {
  UserRole,
  PostVisibility,
  NotificationType,
  SubscriptionStatus,
  SubscriptionTier,
} from './enums';

// -- User --

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface UserProfile extends UserSummary {
  bio: string | null;
  followerCount: number;
  followingCount: number;
  createdAt: string;
  profile: {
    coverImageUrl: string | null;
    website: string | null;
    location: string | null;
  } | null;
  _count: {
    posts: number;
  };
  isFollowing: boolean;
}

/** Shape returned by GET /auth/me (flattened) */
export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  website: string | null;
  location: string | null;
  isVerified: boolean;
  isPremium: boolean;
  role: UserRole;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
}

// -- Post --

export interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  visibility: PostVisibility;
  isEdited: boolean;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  repostOfId: string | null;
  author: UserSummary;
  repostOf: {
    id: string;
    content: string;
    mediaUrls: string[];
    createdAt: string;
    author: UserSummary;
  } | null;
  /** Only present when requested with auth */
  isLiked?: boolean;
  /** Only present when requested with auth */
  isBookmarked?: boolean;
}

// -- Comment --

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  postId: string;
  parentId: string | null;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
  author: UserSummary;
  _count: {
    replies: number;
  };
}

// -- Notification --

export interface Notification {
  id: string;
  type: NotificationType;
  recipientId: string;
  actorId: string | null;
  targetId: string | null;
  targetType: string | null;
  read: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}

// -- Subscription --

export interface SubscriptionData {
  id: string;
  stripePriceId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface SubscriptionState {
  tier: SubscriptionTier | 'free';
  status: SubscriptionStatus | null;
  subscription: SubscriptionData | null;
}

export interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  createdAt: string | null;
}

// -- Hashtag --

export interface Hashtag {
  id: string;
  name: string;
  postsCount: number;
}
