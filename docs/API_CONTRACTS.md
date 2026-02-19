# API Contracts

All endpoints are prefixed with `/api/v1`. Authentication uses Bearer tokens in the `Authorization` header. Refresh tokens are stored in HTTP-only cookies.

## Standard Response Formats

**Paginated Response:**
```json
{
  "data": [...],
  "nextCursor": "string | null",
  "hasMore": boolean
}
```

**Error Response:**
```json
{
  "error": "string",
  "details": [{ "field": "string", "message": "string" }]  // only for validation errors
}
```

**Message Response:**
```json
{ "message": "string" }
```

---

## Auth Routes (`/auth`)

### POST /auth/register
- **Auth:** None
- **Rate limited:** Yes (authLimiter)
- **Request:**
  ```json
  { "email": "string", "username": "string", "password": "string", "displayName": "string" }
  ```
- **Response (201):**
  ```json
  { "user": { "id", "email", "username", "displayName", "role", "createdAt" }, "accessToken": "string" }
  ```
- **Cookie:** Sets `refresh_token` HTTP-only cookie

### POST /auth/login
- **Auth:** None
- **Rate limited:** Yes
- **Request:** `{ "email": "string", "password": "string" }`
- **Response (200):** `{ "user": { "id", "email", "username", "displayName", "role" }, "accessToken": "string" }`
- **Cookie:** Sets `refresh_token` HTTP-only cookie

### POST /auth/refresh
- **Auth:** None (uses cookie)
- **Request:** Empty body (refresh token read from cookie or body.refreshToken)
- **Response (200):** `{ "accessToken": "string" }`
- **Cookie:** Sets new `refresh_token`

### POST /auth/logout
- **Auth:** None (uses cookie)
- **Response (200):** `{ "message": "Logged out successfully" }`
- **Cookie:** Clears `refresh_token`

### GET /auth/me
- **Auth:** Required
- **Response (200):**
  ```json
  {
    "user": {
      "id", "email", "username", "displayName", "bio", "avatarUrl",
      "coverUrl", "website", "location", "isVerified",
      "isPremium", "role", "followersCount", "followingCount", "postsCount", "createdAt"
    }
  }
  ```

### POST /auth/forgot-password
- **Auth:** None
- **Rate limited:** Yes
- **Request:** `{ "email": "string" }`
- **Response (200):** `{ "message": "If that email exists, a reset link has been sent." }`

### POST /auth/reset-password
- **Auth:** None
- **Rate limited:** Yes
- **Request:** `{ "token": "string", "password": "string" }`
- **Response (200):** `{ "message": "Password has been reset successfully." }`

### POST /auth/verify-email
- **Auth:** None
- **Request:** `{ "token": "string" }`
- **Response (200):** `{ "message": "Email verified successfully." }`

### POST /auth/request-verification
- **Auth:** Required
- **Rate limited:** Yes
- **Response (200):** `{ "message": "Verification email sent." }`

### POST /auth/change-password
- **Auth:** Required
- **Request:** `{ "currentPassword": "string", "newPassword": "string" }`
- **Response (200):** `{ "message": "Password changed successfully." }`

---

## User Routes (`/users`)

> **Note:** All `:id` params in user routes accept both UUIDs and usernames via the `resolveUserId` helper.

### GET /users/:id
- **Auth:** Optional
- **Response (200):** User profile with follow status, counts

### PATCH /users/:id
- **Auth:** Required (must be own profile or ADMIN)
- **Request:** `{ "displayName?", "bio?", "avatarUrl?", "profile?": { "website?", "location?", "coverImageUrl?", "birthday?" } }`
- **Response (200):** Updated user

### GET /users/:id/followers
- **Auth:** Optional
- **Query:** `{ cursor?, limit? }`
- **Response (200):** PaginatedResponse of UserSummary

### GET /users/:id/following
- **Auth:** Optional
- **Query:** `{ cursor?, limit? }`
- **Response (200):** PaginatedResponse of UserSummary

### POST /users/:id/follow
- **Auth:** Required
- **Response (201):** `{ "following": true }`

### DELETE /users/:id/follow
- **Auth:** Required
- **Response (200):** `{ "message": "Unfollowed successfully" }`

---

## Post Routes (`/posts`)

### GET /posts/feed
- **Auth:** Required
- **Query:** `{ cursor?, limit? }`
- **Response (200):** PaginatedResponse of Post

### GET /posts/explore
- **Auth:** Optional
- **Query:** `{ cursor?, limit? }`
- **Response (200):** PaginatedResponse of Post

### POST /posts
- **Auth:** Required
- **Request:** `{ "content": "string", "visibility?": "PUBLIC" | "FOLLOWERS_ONLY", "repostOfId?": "string" }`
- **Response (201):** Post object

### POST /posts/:id/media
- **Auth:** Required
- **Rate limited:** Yes (uploadLimiter)
- **Request:** multipart/form-data with `files` field (max 4 files)
- **Response (200):** `{ "id": "string", "mediaUrls": string[] }`

### GET /posts/:id
- **Auth:** Optional
- **Response (200):** Post with `isLiked` and `isBookmarked` flags

### PATCH /posts/:id
- **Auth:** Required (must be author or ADMIN)
- **Request:** `{ "content?": "string", "visibility?": "PUBLIC" | "FOLLOWERS_ONLY" }`
- **Response (200):** Updated post

### DELETE /posts/:id
- **Auth:** Required (must be author or ADMIN)
- **Response (200):** `{ "message": "Post deleted successfully" }`

### POST /posts/:id/like
- **Auth:** Required
- **Response (200):** `{ "liked": boolean }` (toggles like)

### POST /posts/:id/bookmark
- **Auth:** Required
- **Response (200):** `{ "bookmarked": boolean }` (toggles bookmark)

### GET /posts/user/:userId
- **Auth:** Optional
- **Query:** `{ cursor?, limit? }`
- **Response (200):** PaginatedResponse of Post

---

## Comment Routes (`/comments`)

### GET /comments/posts/:postId/comments
- **Auth:** Optional
- **Query:** `{ cursor?, limit? }`
- **Response (200):** PaginatedResponse of Comment (top-level only)

### GET /comments/:id/replies
- **Auth:** Optional
- **Query:** `{ cursor?, limit? }`
- **Response (200):** PaginatedResponse of Comment replies

### POST /comments/posts/:postId/comments
- **Auth:** Required
- **Request:** `{ "content": "string", "parentId?": "string" }`
- **Response (201):** Comment object

### PATCH /comments/:id
- **Auth:** Required (must be author or ADMIN)
- **Request:** `{ "content": "string" }`
- **Response (200):** Updated comment

### DELETE /comments/:id
- **Auth:** Required (must be author or ADMIN)
- **Response (200):** `{ "message": "Comment deleted successfully" }`

---

## Notification Routes (`/notifications`)

### GET /notifications
- **Auth:** Required
- **Query:** `{ cursor?, limit? }`
- **Response (200):** PaginatedResponse of Notification

### GET /notifications/unread-count
- **Auth:** Required
- **Response (200):** `{ "count": number }`

### PATCH /notifications/:id/read
- **Auth:** Required
- **Response (200):** `{ "message": "Notification marked as read" }`

### POST /notifications/read-all
- **Auth:** Required
- **Response (200):** `{ "message": "All notifications marked as read" }`

---

## Payment Routes (`/payments`)

### POST /payments/create-checkout
- **Auth:** Required
- **Request:** `{ "priceId": "string", "successUrl": "string", "cancelUrl": "string" }`
- **Response (200):** `{ "url": "string" }`

### POST /payments/create-portal
- **Auth:** Required
- **Request:** `{ "returnUrl?": "string" }`
- **Response (200):** `{ "url": "string" }`

### POST /payments/webhook
- **Auth:** Stripe signature verification
- **Request:** Raw body with `stripe-signature` header
- **Response (200):** `{ "received": true }`

### GET /payments/subscription
- **Auth:** Required
- **Response (200):** `{ "tier": "free" | "premium" | "pro", "status": SubscriptionStatus | null, "subscription": SubscriptionData | null }`

### POST /payments/cancel
- **Auth:** Required
- **Response (200):** `{ "message": "..." }`

### POST /payments/resume
- **Auth:** Required
- **Response (200):** `{ "message": "..." }`

### GET /payments/invoices
- **Auth:** Required
- **Response (200):** `{ "invoices": Invoice[] }`

---

## Search Routes (`/search`)

### GET /search
- **Auth:** Optional
- **Query:** `{ q: "string", limit? }`
- **Response (200):** `{ "users": UserSummary[] }` (MVP: user search only)

### GET /search/autocomplete
- **Auth:** Optional
- **Query:** `{ q: "string", limit? }` (min 2 chars, max 10 results)
- **Response (200):** `{ "users": [{ id, username, displayName, avatarUrl, isVerified }] }`

### GET /search/suggestions
- **Auth:** Optional
- **Query:** `{ limit? }` (default 20, max 50)
- **Response (200):** `{ "data": UserSummary[] }` (excludes already-followed users when authenticated)

---

## WebSocket Events

Connection requires auth token in handshake: `{ auth: { token } }`

### Client -> Server
| Event | Payload | Description |
|-------|---------|-------------|
| `presence:online` | none | Signal online status |

### Server -> Client
| Event | Payload | Description |
|-------|---------|-------------|
| `notification` | Notification object | New notification |
| `presence:update` | `{ userId, status: "online" \| "offline" }` | Online/offline status |
| `error` | `{ message }` | Error message |

---

## Integration Issues Found and Fixed

1. **Feed response shape:** Frontend expected `data.posts` but backend returns `{ data: [...] }` -- FIXED in useFeed.ts
2. **Post visibility enum:** Frontend used lowercase `"public"/"followers"` but backend uses `"PUBLIC"/"FOLLOWERS_ONLY"` -- FIXED in PostComposer.tsx, useFeed.ts
3. **Post creation flow:** Frontend sent FormData to POST /posts but backend expects JSON body, with separate /posts/:id/media for uploads -- FIXED in PostComposer.tsx
4. **Conversation API path:** Frontend called `/conversations` instead of `/messages/conversations` -- FIXED in useMessages.ts
5. **Messages response shape:** Frontend expected `data.messages` but backend returns `{ data: [...] }` -- FIXED in useMessages.ts
6. **WebSocket event names:** Frontend used underscores (`new_message`, `join_conversation`) but server uses colons (`message:new`, `join:conversation`) -- FIXED in useMessages.ts
7. **Notification types:** Frontend used lowercase strings but backend sends uppercase enums -- FIXED in NotificationItem.tsx
8. **Notifications response shape:** Frontend expected `data.notifications` but backend returns `{ data: [...] }` -- FIXED in NotificationList.tsx
9. **Mark all read method:** Frontend used PATCH but backend expects POST for `/notifications/read-all` -- FIXED in NotificationList.tsx
10. **Send message response:** Frontend expected `data.message` wrapper but backend returns message directly -- FIXED in useMessages.ts
11. **Notification actor nullable:** Backend allows null actor but frontend did not handle it -- FIXED in NotificationItem.tsx
12. **Comment API path:** Frontend called `/posts/:id/comments` but backend mounts comments at `/comments/posts/:postId/comments` -- FIXED in CommentSection.tsx
13. **Comments response shape:** Frontend expected `data.comments` but backend returns `{ data: [...] }` -- FIXED in CommentSection.tsx
14. **Create comment response:** Frontend expected `data.comment` wrapper but backend returns comment directly -- FIXED in CommentSection.tsx
15. **Settings profile update request shape:** Frontend sent `website`/`location` as top-level fields but backend expects them nested inside `profile: {}` -- FIXED in settings/page.tsx
16. **Settings profile update response:** Frontend expected `response.user` wrapper but backend returns user directly -- FIXED in settings/page.tsx
17. **Profile page data mapping:** Backend GET /users/:id returns nested `profile.coverImageUrl`/`_count.followers` etc. but frontend User type expects flat fields -- FIXED in profile/[username]/page.tsx
18. **User routes username support:** Followers/following/follow/unfollow routes only accepted user IDs but frontend passes usernames from profile pages -- FIXED in users.routes.ts using resolveUserId helper

### Schema Simplification (PRD v1.1 re-audit)

19. **`isPrivate` removed from schema:** `auth.service.ts getMe()` selected `isPrivate` which no longer exists in User model -- FIXED: removed from select and response mapping
20. **Denormalized follow counts:** `getMe()` used `_count: { select: { followers, following } }` but schema now has `followerCount`/`followingCount` directly on User -- FIXED in auth.service.ts
21. **`isPremium` now direct field:** `getMe()` derived premium status from `subscription?.status === 'ACTIVE'` but `isPremium` is now a direct boolean on User -- FIXED in auth.service.ts
22. **Profile page count mapping:** Frontend mapped `data._count?.followers`/`data._count?.following` but backend now returns `followerCount`/`followingCount` directly -- FIXED in profile/[username]/page.tsx
23. **`isPrivate` in authStore:** Frontend `User` interface included `isPrivate: boolean` which no longer exists -- FIXED: removed from authStore.ts
24. **`isPrivate` in settings page:** Settings page used `defaultChecked={user.isPrivate}` -- FIXED: changed to `defaultChecked={false}`
25. **DMs removed (PRD v1.1):** All Message/Conversation types, routes, and WebSocket events removed from shared types -- FIXED in shared/types/models.ts, api.ts, events.ts
26. **Dead enums removed:** `ConversationType`, `FollowStatus` enums removed; `FOLLOW_REQUEST`/`MESSAGE` removed from NotificationType -- FIXED in shared/types/enums.ts
27. **Follow response simplified:** Backend returns `{ following: true }` (no PENDING state) -- FIXED in shared/types/api.ts, API_CONTRACTS.md
28. **Comment likes removed:** Like model only supports `postId` (no `commentId`), comment `_count` only has `replies` -- FIXED in shared/types/models.ts
29. **Search simplified to user-only:** MVP search returns `{ users: [...] }` only, no posts/hashtags; added autocomplete and suggestions endpoints -- Updated API_CONTRACTS.md
30. **Shared validators `isPrivate`:** `updateUserSchema` included `isPrivate: z.boolean().optional()` -- FIXED: removed from shared/validators/index.ts
