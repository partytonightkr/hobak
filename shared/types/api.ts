// Shared API request/response types
// These define the exact contract between frontend and backend

import type {
  Post,
  Comment,
  Notification,
  AuthenticatedUser,
  UserProfile,
  UserSummary,
  Hashtag,
  SubscriptionData,
} from './models';
import type { SubscriptionTier, SubscriptionStatus } from './enums';

// -- Pagination --

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// -- Auth --

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  displayName: string;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    role: string;
    createdAt: string;
  };
  accessToken: string;
  // refreshToken is set as HTTP-only cookie
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    role: string;
  };
  accessToken: string;
  // refreshToken is set as HTTP-only cookie
}

export interface RefreshResponse {
  accessToken: string;
  // new refreshToken is set as HTTP-only cookie
}

export interface MeResponse {
  user: AuthenticatedUser;
}

// -- Users --

export type GetUserResponse = UserProfile;

export interface UpdateUserRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string | null;
  profile?: {
    website?: string | null;
    location?: string | null;
    coverImageUrl?: string | null;
    birthday?: string | null;
  };
}

export type FollowersResponse = PaginatedResponse<UserSummary & { bio: string | null }>;
export type FollowingResponse = PaginatedResponse<UserSummary & { bio: string | null }>;

export interface FollowResponse {
  following: true;
}

// -- Posts --

export interface CreatePostRequest {
  content: string;
  visibility?: 'PUBLIC' | 'FOLLOWERS_ONLY';
  repostOfId?: string;
}

export interface UpdatePostRequest {
  content?: string;
  visibility?: 'PUBLIC' | 'FOLLOWERS_ONLY';
}

export type FeedResponse = PaginatedResponse<Post>;
export type GetPostResponse = Post & { isLiked: boolean; isBookmarked: boolean };

export interface LikeResponse {
  liked: boolean;
}

export interface BookmarkResponse {
  bookmarked: boolean;
}

export interface MediaUploadResponse {
  id: string;
  mediaUrls: string[];
}

// -- Comments --

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export type CommentsResponse = PaginatedResponse<Comment>;

// -- Notifications --

export type NotificationsResponse = PaginatedResponse<Notification>;

export interface UnreadCountResponse {
  count: number;
}

// -- Payments --

export interface CreateCheckoutRequest {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResponse {
  url: string;
}

export interface CreatePortalRequest {
  returnUrl?: string;
}

export interface CreatePortalResponse {
  url: string;
}

export interface GetSubscriptionResponse {
  tier: SubscriptionTier | 'free';
  status: SubscriptionStatus | null;
  subscription: SubscriptionData | null;
}

export interface GetInvoicesResponse {
  invoices: {
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
  }[];
}

// -- Search --

export interface SearchParams {
  q: string;
  type?: 'users' | 'posts' | 'hashtags' | 'all';
  limit?: number;
  cursor?: string;
}

export interface SearchResponse {
  users?: (UserSummary & { bio: string | null; _count: { followers: number } })[];
  posts?: Post[];
  hashtags?: Hashtag[];
}

export interface TrendingResponse {
  data: Hashtag[];
}

// -- Errors --

export interface ApiErrorResponse {
  error: string;
  details?: {
    field: string;
    message: string;
  }[];
}

export interface MessageResponse {
  message: string;
}
