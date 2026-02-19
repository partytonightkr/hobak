# Architecture Guide

> Commune — Dog Social Platform Architectural Patterns and Design Decisions
> **Version:** 2.0 (Updated 2026-02-19 to align with PRD v2.0 dog platform pivot)

This document covers the key architectural patterns for building Commune, a dog-centric social platform with AI personality agents, medical records, and location sharing. Sections are marked **MVP** or **v2.1+** to indicate when they apply.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Feed Generation](#feed-generation)
3. [Social Graph (Dog-to-Dog)](#social-graph)
4. [AI Dog Agent Architecture](#ai-dog-agent-architecture)
5. [Medical Data Architecture](#medical-data-architecture)
6. [Location System](#location-system)
7. [Real-time Messaging (v2.1+)](#real-time-messaging)
8. [Content Moderation](#content-moderation)
9. [Notification System](#notification-system)
10. [API Design](#api-design)
11. [Data Flow](#data-flow)
12. [Scaling Strategy](#scaling-strategy)

---

## System Overview

### MVP Architecture

```
                    +-----------+
                    |   Client  |
                    | (Next.js) |
                    +-----+-----+
                          |
                    +-----v------+
                    |  Next.js   |
                    |  App +     |
                    |  API Routes|
                    +-----+------+
                          |
            +-------------+-------------+
            |             |             |
      +-----v---+  +-----v-----+  +---v--------+
      |PostgreSQL|  | Local FS  |  | Claude API |
      +---------+  +-----------+  +------------+
```

**MVP is a single Next.js application** with Route Handlers serving as the API layer. No separate backend, no Redis, no WebSocket server. Claude API calls are made server-side for AI dog agent interactions. This minimizes deployment complexity, eliminates CORS, and shares authentication context.

### v1.1+ Architecture (When DMs Ship)

```
                    +-----------+
                    |   Client  |
                    | (Next.js) |
                    +-----+-----+
                          |
              +-----------+-----------+
              |                       |
        +-----v-----+         +------v------+
        |  Next.js   |         |  Socket.io  |
        |  App +     |         |  WebSocket  |
        |  API Routes|         |  Server     |
        +-----+------+         +------+------+
              |                       |
              +----------+------------+
                         |
              +----------v-----------+
              |                      |
        +-----v---+ +---v----+ +---v-----+
        |PostgreSQL| | Redis  | | S3/CDN  |
        +---------+ +--------+ +---------+
```

### Layer Responsibilities

| Layer | MVP | v1.1+ |
|-------|-----|-------|
| **Next.js Client** | UI rendering, client-side state, optimistic updates | Same |
| **Next.js API Routes** | Business logic, validation, auth, data access, SSE notifications | Same + delegate real-time to Socket.io |
| **Socket.io** | Not used | Real-time messaging, presence, typing indicators |
| **PostgreSQL** | All persistent data, sessions, rate limiting state | Same + consider read replicas |
| **Redis** | Not used | Caching, Socket.io adapter, rate limiting, presence |
| **Storage** | Local filesystem | S3-compatible + CDN |

---

## Feed Generation

Feed generation is the most architecturally significant decision in a social app. There are two primary strategies.

### Strategy 1: Fan-Out on Read (Pull Model)

**How it works:** When a user opens their feed, the system queries the database for the latest posts from all users they follow, sorts by timestamp, and returns the result.

```sql
-- Simplified feed query
SELECT p.*, u.username, u.avatar_url
FROM posts p
JOIN follows f ON f.following_id = p.author_id
JOIN users u ON u.id = p.author_id
WHERE f.follower_id = :current_user_id
  AND p.created_at > NOW() - INTERVAL '7 days'
ORDER BY p.created_at DESC
LIMIT 20 OFFSET :offset;
```

**Pros:**
- Simple to implement
- No write amplification (posting is a single INSERT)
- Always fresh data
- No storage overhead for pre-computed feeds

**Cons:**
- Read latency increases with the number of followings
- Database load scales with read traffic (every feed view = expensive query)
- Difficult to mix in algorithmic ranking without caching

**Best for:** MVP phase, apps with < 100K users, when most users follow < 500 accounts.

### Strategy 2: Fan-Out on Write (Push Model)

**How it works:** When a user creates a post, the system immediately writes that post's ID into the feed (inbox) of every follower.

```
User A creates a post
  -> System looks up A's 10,000 followers
  -> Writes post reference to each follower's feed cache (Redis sorted set)
  -> When followers open their feed, it's already pre-computed
```

```typescript
// Fan-out on write (simplified)
async function createPost(authorId: string, content: string) {
  const post = await prisma.post.create({ data: { authorId, content } });

  const followers = await prisma.follow.findMany({
    where: { followingId: authorId },
    select: { followerId: true },
  });

  // Push to each follower's feed in Redis
  const pipeline = redis.pipeline();
  for (const { followerId } of followers) {
    pipeline.zadd(`feed:${followerId}`, post.createdAt.getTime(), post.id);
    pipeline.zremrangebyrank(`feed:${followerId}`, 0, -1001); // Keep last 1000
  }
  await pipeline.exec();
}
```

**Pros:**
- Feed reads are extremely fast (read from pre-computed sorted set)
- Predictable read latency regardless of following count
- Easy to mix in algorithmic ranking during fan-out

**Cons:**
- Write amplification: one post to a celebrity with 1M followers = 1M writes
- Storage overhead for duplicated feed entries
- Stale feeds if fan-out is delayed
- Complexity in handling unfollows (need to remove from all feeds)

**Best for:** Production apps with high read-to-write ratios, when user experience of instant feed loading is critical.

### Recommended Approach

**MVP: Fan-Out on Read, no caching.** A single PostgreSQL query with proper indexes serves a chronological feed. No Redis caching needed at MVP scale (~100 concurrent users). This is the simplest possible implementation.

**MVP implementation:**
- Single PostgreSQL query joining `follows` and `posts` tables
- Index: `CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC)`
- Cursor-based pagination using `createdAt` for stable infinite scroll
- No feed ranking -- purely reverse-chronological (per PRD v1.1)

**v1.1+ (Hybrid):**
- Fan-out on write for "normal" users (< 10K followers)
- Fan-out on read for "celebrity" users (> 10K followers) to avoid write amplification
- Merge the two result sets at read time
- Use background job queue (BullMQ) for async fan-out

```
              +----------------+
              | New Post Event |
              +-------+--------+
                      |
            +---------v----------+
            | Author has > 10K   |
            | followers?         |
            +---------+----------+
                 /         \
               No           Yes
              /               \
    +--------v-------+  +------v--------+
    | Fan-out write  |  | Store in      |
    | to all feeds   |  | author's      |
    | (async worker) |  | outbox only   |
    +----------------+  +------+--------+
                               |
                    (merged at read time
                     with pre-computed feed)
```

### Feed Ranking

For MVP, chronological reverse-chronological ordering is sufficient. For production, consider a lightweight ranking signal:

```
score = base_time_score
      + (like_count * 0.1)
      + (comment_count * 0.3)
      + (is_from_close_friend * 0.5)
      - (hours_since_posted * decay_rate)
```

---

## Social Graph (Dog-to-Dog)

### Data Model

In Commune, the social graph is **dog-to-dog**, not user-to-user. Dogs follow other dogs, and the owner sees a combined feed from all their dogs' follows.

```sql
CREATE TABLE follows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_dog_id  UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  following_dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_dog_id, following_dog_id)
);

-- Index for "who does this dog follow?" queries (feed generation)
CREATE INDEX idx_follows_follower ON follows(follower_dog_id, created_at DESC);

-- Index for "who follows this dog?" queries (follower list)
CREATE INDEX idx_follows_following ON follows(following_dog_id, created_at DESC);
```

### Graph Query Patterns

**Mutual follows (dog friends):**
```sql
SELECT f1.following_dog_id
FROM follows f1
JOIN follows f2 ON f1.following_dog_id = f2.follower_dog_id
                AND f1.follower_dog_id = f2.following_dog_id
WHERE f1.follower_dog_id = :dog_id;
```

**Dogs you may know (followed by dogs your dog follows):**
```sql
SELECT f2.following_dog_id, COUNT(*) as mutual_count
FROM follows f1
JOIN follows f2 ON f1.following_dog_id = f2.follower_dog_id
WHERE f1.follower_dog_id = :dog_id
  AND f2.following_dog_id != :dog_id
  AND f2.following_dog_id NOT IN (
    SELECT following_dog_id FROM follows WHERE follower_dog_id = :dog_id
  )
GROUP BY f2.following_dog_id
ORDER BY mutual_count DESC
LIMIT 20;
```

**Breed-based suggestions:**
```sql
SELECT d.*, COUNT(f.id) AS follower_count
FROM dogs d
LEFT JOIN follows f ON f.following_dog_id = d.id
WHERE d.breed = :current_dog_breed
  AND d.id != :current_dog_id
  AND d.id NOT IN (SELECT following_dog_id FROM follows WHERE follower_dog_id = :current_dog_id)
GROUP BY d.id
ORDER BY follower_count DESC
LIMIT 10;
```

### Combined Owner Feed

Since an owner can have multiple dogs, the feed must merge follows from all their dogs:

```sql
SELECT p.* FROM posts p
JOIN follows f ON f.following_dog_id = p.dog_id
JOIN dogs d ON d.id = f.follower_dog_id
WHERE d.owner_id = :owner_user_id
ORDER BY p.created_at DESC
LIMIT 20;
```

Optional: filter by a single dog's follows using `AND d.id = :specific_dog_id`.

### Denormalized Counters

Maintain denormalized counters on the `dogs` table (not `users`):

```sql
ALTER TABLE dogs ADD COLUMN follower_count  INT NOT NULL DEFAULT 0;
ALTER TABLE dogs ADD COLUMN following_count INT NOT NULL DEFAULT 0;
```

Update these atomically when follow/unfollow occurs:

```typescript
async function followDog(followerDogId: string, followingDogId: string) {
  await prisma.$transaction([
    prisma.follow.create({ data: { followerDogId, followingDogId } }),
    prisma.dog.update({ where: { id: followingDogId }, data: { followerCount: { increment: 1 } } }),
    prisma.dog.update({ where: { id: followerDogId }, data: { followingCount: { increment: 1 } } }),
  ]);
}
```

### Scaling the Social Graph

For MVP, PostgreSQL handles the social graph well up to millions of edges. At larger scale:

- **Graph database (Neo4j, Amazon Neptune):** Consider if graph traversal queries (friends-of-friends, shortest path, community detection) become core features.
- **Adjacency list in Redis:** Cache the follower/following lists in Redis sets for fast membership checks (`SISMEMBER`).
- **Separate graph service:** Extract the social graph into its own microservice with its own storage when the monolith becomes a bottleneck.

---

## AI Dog Agent Architecture

### Overview

Each dog on the platform gets an AI personality agent powered by Claude (claude-sonnet-4-6) that generates content in the dog's unique "voice." The owner always approves AI content before publication.

### System Prompt Architecture

```
+------------------+     +-------------------+     +-------------+
| Dog Profile Data |---->| Prompt Builder    |---->| Claude API  |
| (breed, traits,  |     | (server-side)     |     | Request     |
|  age, name,      |     +-------------------+     +------+------+
|  temperament)    |                                       |
+------------------+                                       v
                                                  +--------+--------+
                                                  | Content Filter   |
                                                  | (moderation)     |
                                                  +--------+--------+
                                                           |
                                                           v
                                                  +--------+--------+
                                                  | Owner Approval   |
                                                  | Queue (UI)       |
                                                  +--------+--------+
                                                           |
                                                           v
                                                  +--------+--------+
                                                  | Published Post   |
                                                  | (labeled AI)     |
                                                  +-----------------+
```

### Key Design Decisions

1. **System prompt is server-side only.** Never sent to the client. The `/api/v1/dogs/:id/ai` endpoints accept a user prompt and return the AI response -- the system prompt is injected server-side.

2. **No streaming for MVP.** AI outputs are short (1-3 sentences). A simple request/response is sufficient. Streaming adds complexity for minimal UX benefit at this output length.

3. **Rate limiting per dog, not per user.** A multi-dog owner's dogs each get their own interaction quota. This prevents a single dog from exhausting the owner's entire quota. Stored in `DogAIConfig.interactionsToday`.

4. **Idempotent AI requests.** If the owner doesn't like a suggestion, they can regenerate. Each regeneration counts toward the daily limit.

### AI Interaction Types

| Type | Input | System Prompt Addition | Max Tokens |
|------|-------|----------------------|------------|
| Photo caption | Image description (from owner or EXIF) | "Write a short, fun caption for this photo from your perspective." | 200 |
| Post generation | Topic/prompt from owner | "Write a social media post about this topic from your perspective." | 500 |
| Comment reply | Original comment text | "Write a short, playful reply to this comment from your perspective." | 200 |

### Content Safety Pipeline

All AI outputs go through a content safety check before being shown to the owner:

```typescript
async function generateAIContent(dogId: string, type: AIInteractionType, input: string) {
  // 1. Check rate limit
  const config = await getDogAIConfig(dogId);
  if (!isPremium(config.dog.ownerId) && config.interactionsToday >= 10) {
    throw new RateLimitError('Daily AI interaction limit reached');
  }

  // 2. Build system prompt (server-side only)
  const systemPrompt = buildDogPrompt(config.dog);

  // 3. Call Claude API
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: type === 'post' ? 500 : 200,
    system: systemPrompt,
    messages: [{ role: 'user', content: input }],
  });

  // 4. Content moderation filter
  const text = response.content[0].text;
  const modResult = checkContent(text);
  if (!modResult.allowed) {
    return { text: null, blocked: true, reason: modResult.reasons };
  }

  // 5. Increment daily counter
  await incrementAIInteraction(dogId);

  // 6. Return for owner approval (NOT auto-published)
  return { text, blocked: false, aiAssisted: true };
}
```

---

## Medical Data Architecture

### Overview

Each dog has a private medical dashboard with vaccinations, vet visits, medications, weight logs, and allergies. This data can be shared via secure, time-limited links.

### Data Model

```
Dog (1) ----< Vaccination (N)
Dog (1) ----< VetVisit (N)
Dog (1) ----< Medication (N)
Dog (1) ----< WeightLog (N)
Dog (1) ----< Allergy (N)
Dog (1) ----< MedicalShareLink (N)
```

### Privacy and Security

1. **All medical data is private by default.** Only the dog's owner can view it.
2. **Shareable links use unguessable tokens.** Generated with `crypto.randomUUID()` or `nanoid(32)`, NOT sequential IDs.
3. **Share links have expiration.** Default 30 days, configurable by owner. Revocable at any time.
4. **Medical data encrypted at rest.** Use PostgreSQL column-level encryption for sensitive fields (diagnosis, treatment notes) via `pgcrypto` extension, or application-level encryption if column-level is insufficient.
5. **No public API for medical data.** Medical endpoints require authentication + ownership check. Share links use a separate read-only endpoint with token-based access.

### Share Link Architecture

```
Owner generates share link
  -> Server creates MedicalShareLink { dogId, token, expiresAt }
  -> Returns URL: /medical/share/{token}
  -> Recipient visits URL (no auth required)
  -> Server validates token, checks expiration, returns read-only vaccination data
  -> Owner can revoke: sets revokedAt on the link
```

### Vaccination Reminders

```
Daily cron job (or on-login check):
  -> Query vaccinations where nextDueDate is within 14 days or 7 days
  -> For each, check if reminder notification already sent
  -> If not, create notification: "Buddy's rabies vaccination is due in 7 days"
  -> Notification type: VACCINATION_REMINDER
```

---

## Location System

### Overview

Location features include dog park finder, park check-ins, nearby dogs discovery, and lost dog alerts. All location features are opt-in.

### Architecture

```
+------------------+     +-----------------+     +----------------+
| Browser          |     | API Server      |     | PostgreSQL     |
| Geolocation API  |---->| /api/v1/parks   |---->| earthdistance  |
| (opt-in)         |     | /api/v1/alerts  |     | extension      |
+------------------+     +-----------------+     +----------------+
        |                        |
        v                        v
+------------------+     +-----------------+
| Leaflet Map      |     | SSE Stream      |
| (client-side)    |     | (lost dog       |
|                  |     |  alerts)        |
+------------------+     +-----------------+
```

### Location Precision Levels

| Feature | Precision | Storage | Privacy Level |
|---------|-----------|---------|---------------|
| Nearby dogs | Neighborhood (~0.01 degree) | Rounded coordinates | Low risk |
| Dog park finder | Exact park location | Full coordinates | Public data |
| Park check-in | Exact park location | Park ID reference | Medium (visible to friends) |
| Lost dog alert | Exact last-seen location | Full coordinates | Public (emergency) |

### Spatial Queries

Using PostgreSQL `earthdistance` extension (simpler than PostGIS for basic radius queries):

```sql
-- Parks within radius
SELECT *, earth_distance(
  ll_to_earth(latitude, longitude),
  ll_to_earth(:lat, :lng)
) AS distance_m
FROM dog_parks
WHERE earth_box(ll_to_earth(:lat, :lng), :radius_meters) @> ll_to_earth(latitude, longitude)
ORDER BY distance_m
LIMIT 20;

-- Active check-ins at a park
SELECT c.*, d.name AS dog_name, d.avatar_url
FROM park_check_ins c
JOIN dogs d ON d.id = c.dog_id
WHERE c.park_id = :parkId
  AND c.checked_out_at IS NULL
  AND c.checked_in_at > NOW() - INTERVAL '3 hours';
```

### Lost Dog Alert Distribution

```
Owner creates lost dog alert
  -> Alert stored with exact last-seen coordinates
  -> Broadcast via SSE to all connected users within 10km radius
  -> Also stored in DB for users who connect later
  -> Alert displayed on map with pin + photo + description
  -> Alert status: ACTIVE -> FOUND or CANCELLED
```

### Data Retention

- Park check-ins: auto-expire after 3 hours (set `checked_out_at`)
- Lost dog alerts: remain active until resolved, then archived
- Location history: NOT stored. Only current check-in position is kept.

---

## Real-time Messaging (v2.1+ -- DMs Deferred from MVP)

> **Note:** Direct messaging is deferred to v1.1 per PRD v1.1. This section is retained as a reference for when DMs are implemented. The Prisma schema models (Conversation, ConversationParticipant, Message) and client hooks (useMessages, useSocket, useConversations) should be removed or disabled until v1.1.

### Architecture Overview

```
  Client A                    Server                     Client B
     |                          |                           |
     |-- send_message --------->|                           |
     |                          |-- save to PostgreSQL      |
     |                          |-- publish to Redis        |
     |                          |    pub/sub channel        |
     |                          |                           |
     |                          |<-- Redis delivers to      |
     |                          |    correct server instance |
     |                          |                           |
     |                          |-- new_message ----------->|
     |<-- message_delivered ----|                           |
     |                          |                           |
```

### Message Data Model

```sql
CREATE TABLE conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       VARCHAR(10) NOT NULL CHECK (type IN ('direct', 'group')),
  name       VARCHAR(100),  -- NULL for direct messages
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  muted           BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id),
  content         TEXT NOT NULL,
  type            VARCHAR(10) NOT NULL DEFAULT 'text'
                    CHECK (type IN ('text', 'image', 'file', 'system')),
  metadata        JSONB,  -- image dimensions, file info, etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at       TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ  -- soft delete
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_conv_members_user ON conversation_members(user_id);
```

### Socket.io Event Design

```typescript
// Server-side Socket.io events
io.on('connection', (socket) => {
  const userId = socket.data.userId; // Set during auth middleware

  // Join personal room for direct notifications
  socket.join(`user:${userId}`);

  // Join all conversation rooms the user belongs to
  const conversations = await getConversationIds(userId);
  conversations.forEach(id => socket.join(`conversation:${id}`));

  // Handle sending a message
  socket.on('send_message', async (data, callback) => {
    const { conversationId, content, type } = data;

    // Validate membership
    if (!await isMember(userId, conversationId)) {
      return callback({ error: 'Not a member' });
    }

    // Persist to database
    const message = await createMessage({ conversationId, senderId: userId, content, type });

    // Broadcast to all members in the conversation room
    io.to(`conversation:${conversationId}`).emit('new_message', {
      message,
      conversationId,
    });

    // Acknowledge receipt
    callback({ success: true, messageId: message.id });
  });

  // Typing indicators
  socket.on('typing_start', (data) => {
    socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
      userId,
      conversationId: data.conversationId,
    });
  });

  // Read receipts
  socket.on('mark_read', async (data) => {
    await updateLastRead(userId, data.conversationId);
    socket.to(`conversation:${data.conversationId}`).emit('messages_read', {
      userId,
      conversationId: data.conversationId,
      readAt: new Date(),
    });
  });
});
```

### Offline Message Delivery

When a user is offline and receives a message:

1. Message is saved to PostgreSQL (always happens first)
2. Socket.io emission to the user's room has no connected clients (no-op)
3. When the user reconnects, the client fetches messages since `last_read_at`
4. Push notification is sent via a background job (optional, for mobile)

### Scaling Messaging

**MVP:** Single Socket.io server handles all connections. PostgreSQL stores all messages.

**Production scaling path:**
1. **Multiple Socket.io instances** with Redis adapter for event broadcasting
2. **Message partitioning** by conversation_id for database sharding
3. **Connection load balancing** with sticky sessions (required for Socket.io)
4. **Message queuing** with Redis Streams or Kafka for guaranteed delivery
5. **Read model separation** (CQRS): write messages to a queue, materialize into conversation views asynchronously

---

## Content Moderation

### MVP Approach (Simplified)

Per PRD v1.1, MVP moderation is simplified to:
1. **CSAM image scanning** -- Legal P0 requirement. All uploaded images must be scanned before storage/serving. Integrate PhotoDNA, Thorn's Safer, or cloud provider equivalent.
2. **Community reports** -- Users can report content with reason categories.
3. **Admin review queue** -- Moderators review reports and take action (remove content, warn/suspend/ban user).

Automated spam/NSFW detection, the appeals process, and the audit log are deferred to v1.1.

### v1.1+ Multi-Layer Approach

The full 5-layer moderation strategy for production:

```
Layer 1: Pre-submission    (Client-side)
Layer 2: Automated review  (Server-side, synchronous) -- v1.1+
Layer 3: Community reports  (User-driven) -- MVP
Layer 4: Manual review     (Admin dashboard) -- MVP
Layer 5: Appeals           (User-initiated) -- v1.1+
```

### Layer 1: Client-Side Prevention

- **Character limits** on posts, comments, usernames, and bios
- **Input sanitization:** Strip HTML, prevent XSS
- **Rate limiting UI:** Disable submit button after posting, throttle message sending
- **Content warnings:** Prompt users when content contains potentially sensitive keywords (optional)

### Layer 2: Automated Server-Side Review

**For MVP, implement rule-based moderation:**

```typescript
interface ModerationResult {
  allowed: boolean;
  flags: string[];     // ['spam', 'profanity', 'links']
  action: 'allow' | 'flag' | 'block';
  confidence: number;
}

async function moderateContent(content: string, userId: string): Promise<ModerationResult> {
  const flags: string[] = [];

  // 1. Profanity filter (word list + regex patterns)
  if (containsProfanity(content)) {
    flags.push('profanity');
  }

  // 2. Spam detection
  if (await isSpamming(userId)) {           // Rate: > 10 posts in 1 minute
    flags.push('spam');
  }
  if (hasExcessiveLinks(content)) {         // > 3 links in a single post
    flags.push('excessive_links');
  }
  if (hasRepeatedContent(content, userId)) { // Duplicate post detection
    flags.push('duplicate');
  }

  // 3. URL safety (check against known malicious URL databases)
  const urls = extractUrls(content);
  for (const url of urls) {
    if (await isMaliciousUrl(url)) {
      flags.push('malicious_url');
    }
  }

  // Decision logic
  const blockingFlags = ['malicious_url', 'spam'];
  const shouldBlock = flags.some(f => blockingFlags.includes(f));

  return {
    allowed: !shouldBlock,
    flags,
    action: shouldBlock ? 'block' : flags.length > 0 ? 'flag' : 'allow',
    confidence: shouldBlock ? 0.9 : 0.5,
  };
}
```

**For production, add AI-based moderation:**
- **OpenAI Moderation API:** Free, classifies text for hate, violence, self-harm, sexual content. Low latency.
- **Perspective API (Google):** Scores text for toxicity, insults, threats. Free for moderate usage.
- **Custom model:** Train on your own flagged content for domain-specific moderation.
- **Image moderation:** AWS Rekognition, Google Cloud Vision, or open-source NSFW detection models.

### Layer 3: Community Reporting

```sql
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id),
  target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('post', 'comment', 'message', 'user')),
  target_id   UUID NOT NULL,
  reason      VARCHAR(50) NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'hate_speech', 'violence',
    'nudity', 'misinformation', 'impersonation', 'other'
  )),
  description TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolution  TEXT,
  reviewed_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Prevent duplicate reports from same user
CREATE UNIQUE INDEX idx_reports_unique ON reports(reporter_id, target_type, target_id)
  WHERE status IN ('pending', 'reviewing');
```

### Layer 4: Admin Moderation Dashboard

**Essential features:**
- Queue of flagged/reported content, sorted by priority
- Priority scoring: `priority = report_count * 2 + auto_flag_severity + time_urgency`
- One-click actions: approve, remove content, warn user, suspend user, ban user
- Bulk actions for spam waves
- User moderation history (past violations, warnings issued)
- Content preview with context (who posted, when, engagement metrics)

### Layer 5: Appeals Process

```sql
CREATE TABLE appeals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  action_type   VARCHAR(20) NOT NULL, -- 'content_removal', 'suspension', 'ban'
  action_id     UUID NOT NULL,        -- Reference to the moderation action
  reason        TEXT NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by   UUID REFERENCES users(id),
  decision      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);
```

### Moderation Data Model Summary

```
User creates content
  -> Automated filters (sync, < 100ms)
    -> ALLOW: Content published immediately
    -> FLAG: Content published but queued for review
    -> BLOCK: Content rejected, user notified
      -> User can appeal

Community reports content
  -> Enters moderation queue
  -> Priority based on report count + severity
  -> Admin reviews and takes action
  -> User notified of decision
  -> User can appeal
```

---

## Notification System

### MVP Notification Types

| Type | Trigger | Real-time (SSE) | Email | Push |
|------|---------|-----------------|-------|------|
| New follower | Dog B follows Dog A | Yes | No | No (v2.1) |
| Post pawed | Dog B paws Dog A's post | Yes | No | No (v2.1) |
| Post commented | Dog B comments on Dog A's post | Yes | No | No (v2.1) |
| Comment reply | Dog B replies to Dog A's comment | Yes | No | No (v2.1) |
| Mention | @DogA mentioned in post/comment | Yes | No | No (v2.1) |
| Repost | Dog B reposts Dog A's post | Yes | No | No (v2.1) |
| Vaccination reminder | Vaccination due in 14/7 days | Yes | No | No (v2.1) |
| Nearby dog alert | Followed dog checked in nearby | Yes | No | No (v2.1) |
| Lost dog alert | Lost dog alert in your area | Yes | No | No (v2.1) |

**MVP simplifications (per PRD v2.0):**
- In-app notifications only (no push, no email)
- Individual notifications only (no grouping/aggregation)
- Real-time delivery via SSE (not Socket.io)
- No per-type notification preferences
- Notifications include `dogId` context for dog-specific routing

### Notification Data Model

```sql
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id     UUID REFERENCES users(id),          -- Who triggered it
  type         VARCHAR(30) NOT NULL,                -- 'follow', 'like', 'comment', 'mention', 'message'
  entity_type  VARCHAR(20),                         -- 'post', 'comment', 'conversation'
  entity_id    UUID,                                -- Reference to the entity
  data         JSONB,                               -- Additional context
  read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id) WHERE read = FALSE;
```

### MVP Delivery Pipeline

```
Event occurs (e.g., User B likes User A's post)
  |
  v
Notification service creates DB record
  |
  v
Push to SSE stream for `recipientId`
  |
  +--> If user has active SSE connection: delivered in real-time
  +--> If user is offline: stored in DB, delivered on next page load
```

No email, no push, no aggregation in MVP. Individual notifications only.

### v1.1+ Notification Aggregation

Notification grouping (e.g., "Alice, Bob, and 48 others liked your post") is deferred to v1.1. The aggregation logic is documented here for future implementation:

```typescript
// v1.1+ -- aggregate similar notifications within 24h window
async function createNotification(data: CreateNotificationInput) {
  const existing = await prisma.notification.findFirst({
    where: {
      recipientId: data.recipientId,
      type: data.type,
      entityType: data.entityType,
      entityId: data.entityId,
      read: false,
      createdAt: { gte: subHours(new Date(), 24) },
    },
  });

  if (existing) {
    const actors = (existing.data as any)?.actors || [existing.actorId];
    actors.push(data.actorId);
    await prisma.notification.update({
      where: { id: existing.id },
      data: {
        actorId: data.actorId,
        data: { actors: [...new Set(actors)] },
        createdAt: new Date(),
      },
    });
  } else {
    await prisma.notification.create({ data: { ...data, data: { actors: [data.actorId] } } });
  }
}
```

---

## API Design

### REST API Structure

**MVP endpoints** (Next.js Route Handlers at `/api/v1/`):

```
/api/v1
  /auth
    POST   /register           # Create owner account
    POST   /login              # Email/password login
    POST   /logout             # Invalidate session
    POST   /refresh            # Refresh JWT (reads HTTP-only cookie)

  /users
    GET    /me                 # Current owner profile + their dogs
    PATCH  /me                 # Update owner profile
    GET    /:id                # Get owner by ID (includes their dogs)

  /dogs                        # NEW in v2.0
    POST   /                   # Create dog profile (during onboarding)
    GET    /:id                # Get dog profile (public)
    PATCH  /:id                # Update dog profile (owner only)
    DELETE /:id                # Delete dog profile (owner only)
    GET    /:id/followers      # Dog's followers
    GET    /:id/following      # Dogs this dog follows
    POST   /:id/follow         # Follow a dog
    DELETE /:id/follow         # Unfollow a dog

  /dogs/:id/ai                 # NEW in v2.0 - AI agent
    POST   /caption            # Generate AI photo caption
    POST   /post               # Generate AI post
    POST   /reply              # Generate AI comment reply
    GET    /config             # Get AI config (owner only)
    PATCH  /config             # Update AI personality (owner only)

  /dogs/:id/medical            # NEW in v2.0 - Medical records
    GET    /                   # Get medical dashboard (owner only)
    POST   /vaccinations       # Add vaccination record
    GET    /vaccinations       # List vaccinations
    POST   /vet-visits         # Add vet visit
    GET    /vet-visits         # List vet visits
    POST   /medications        # Add medication
    GET    /medications        # List medications
    POST   /weight             # Add weight log entry
    GET    /weight             # Get weight history
    POST   /allergies          # Add allergy
    GET    /allergies          # List allergies

  /medical-shares              # NEW in v2.0 - Share links
    POST   /                   # Create share link (returns URL)
    DELETE /:id                # Revoke share link
    GET    /:token             # Public: view shared medical data (no auth)

  /posts
    POST   /                   # Create post (requires dog_id)
    GET    /feed               # Combined feed from all owner's dogs' follows
    GET    /feed/:dogId        # Feed for a specific dog
    GET    /:id                # Get single post
    PATCH  /:id                # Edit post
    DELETE /:id                # Delete post
    POST   /:id/like           # Paw (like) a post
    DELETE /:id/like           # Un-paw
    GET    /:id/comments       # Get comments
    POST   /:id/comments       # Add comment (requires dog_id)

  /parks                       # NEW in v2.0 - Dog parks
    GET    /nearby             # Find parks near coordinates
    GET    /:id                # Get park details + active check-ins
    POST   /:id/checkin        # Check in at park (requires dog_id)
    DELETE /:id/checkin        # Check out

  /alerts                      # NEW in v2.0 - Lost dog alerts
    POST   /                   # Create lost dog alert
    GET    /nearby             # Get active alerts near coordinates
    PATCH  /:id                # Update alert status (found/cancelled)

  /notifications
    GET    /                   # List notifications (paginated)
    GET    /stream             # SSE endpoint for real-time
    PATCH  /read               # Mark as read
    GET    /unread-count       # Unread count

  /search
    GET    /dogs?q=            # Search dogs by name/username/breed
    GET    /users?q=           # Search owners
    GET    /breeds             # List breeds with counts

  /reports
    POST   /                   # Report content (includes animal_abuse reason)

  /subscriptions
    GET    /plans              # Available plans
    POST   /checkout           # Create Stripe checkout session
    POST   /portal             # Create Stripe customer portal session
    POST   /webhooks/stripe    # Stripe webhook handler
```

**v2.1+ endpoints** (added when DMs ship):
```
  /conversations
    GET    /                   # List conversations
    POST   /                   # Create conversation
    GET    /:id/messages       # Get messages (paginated)
    POST   /:id/messages       # Send message

  /search
    GET    /posts?q=           # Search posts (tsvector)
    GET    /hashtags?q=        # Search hashtags
```

### Pagination Pattern

Use cursor-based pagination for all list endpoints (more efficient than offset-based for large datasets):

```typescript
// Request
GET /api/v1/posts/feed?cursor=2024-01-15T10:30:00Z&limit=20

// Response
{
  "data": [...],
  "pagination": {
    "nextCursor": "2024-01-15T09:15:00Z",
    "hasMore": true
  }
}
```

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Post content is required",
    "details": [
      { "field": "content", "message": "Must be between 1 and 5000 characters" }
    ]
  }
}
```

---

## Data Flow

### Post Creation Flow (Dog Post)

```
1. Client sends POST /api/v1/posts with content + dog_id + optional media
2. Middleware validates JWT, attaches owner context
3. Route handler validates input (zod schema) + verifies owner owns the dog
4. If AI-assisted: content already approved by owner in previous AI generation step
5. Moderation service checks content (automated filters)
6. If media attached:
   a. CSAM scan (blocking -- must pass before storage)
   b. Upload to storage service
   c. Queue image processing job (thumbnails, optimization)
7. Create post in PostgreSQL with dog_id + ai_assisted flag
8. Extract and sync hashtags
9. Send SSE notification to followers' owners
10. Return created post to client
```

### AI Caption Generation Flow

```
1. Owner uploads photo and taps "AI Caption"
2. Client sends POST /api/v1/dogs/:id/ai/caption with image description
3. Server checks AI rate limit for this dog
4. Server builds system prompt from dog's profile (server-side only)
5. Server calls Claude API with system prompt + user prompt
6. Server runs content moderation filter on AI output
7. Return AI suggestion to owner (NOT published yet)
8. Owner reviews, optionally edits, then publishes as a normal post
9. Published post has ai_assisted=true flag
```

### Authentication Flow (Custom JWT)

**Email/password login:**
```
1. User submits email + password
2. Server verifies credentials (bcrypt compare)
3. Server issues short-lived access token (15 min) + refresh token (7 days)
4. Access token returned in response body -> stored in memory (Zustand)
5. Refresh token set as HTTP-only, Secure, SameSite cookie
6. Subsequent API requests include access token in Authorization header
7. On 401, client hits /api/auth/refresh -> browser sends cookie automatically
8. Server verifies refresh token, rotates it (invalidate old, issue new pair)
```

**OAuth login (Google/GitHub/Apple):**
```
1. User clicks "Sign in with Google"
2. Redirect to Google OAuth consent screen
3. Google redirects back with authorization code
4. Server exchanges code for user info (via Google API)
5. Upsert user in PostgreSQL
6. Issue access + refresh tokens (same as email/password)
```

---

## Scaling Strategy

### Phase 1: MVP (0 - 1K concurrent users)

- Single Next.js application (includes API routes)
- Single PostgreSQL instance
- Local file storage
- Deploy to Railway, Render, or self-hosted Docker
- No Redis, no separate backend, no WebSocket server
- Design for 100 concurrent users; ensure it works up to 1K without a rewrite

### Phase 2: v1.1 Growth (1K - 10K concurrent users)

- Add DMs with Socket.io (requires separate backend process)
- Add Redis for Socket.io adapter, sessions, and rate limiting
- Move file storage to S3/R2 with CDN
- Add background job queue (BullMQ) for async processing
- Add Meilisearch or PostgreSQL tsvector for full-text post search
- Add PgBouncer for connection pooling

### Phase 3: Scale (10K - 100K+ concurrent users)

- PostgreSQL read replicas for feed queries
- Horizontal scaling: multiple server instances behind a load balancer
- Implement hybrid feed generation (fan-out on write + read)
- Database sharding by user_id for messages table
- Message queue (Kafka/RabbitMQ) for event-driven architecture
- Microservice extraction as needed
- Global CDN for static assets and media

### Performance Targets

| Metric | MVP Target | Production Target |
|--------|-----------|------------------|
| Feed load time | < 2s (P95) | < 500ms |
| Post creation | < 1s | < 300ms |
| User search | < 500ms | < 200ms |
| Image upload | < 5s (5MB) | < 2s |
| API P95 latency | < 500ms | < 200ms |
| Notification delivery (SSE) | < 5s | < 1s |

---

## Security Considerations

### API Security

- **Rate limiting:** Per-user and per-IP rate limits on all endpoints. MVP uses in-memory store (single process); v1.1+ uses Redis store for distributed rate limiting.
- **Input validation:** Validate all inputs with zod schemas; reject invalid requests early
- **SQL injection:** Prisma parameterizes all queries by default; never use string interpolation in raw queries
- **XSS prevention:** Sanitize user-generated content; use Content-Security-Policy headers
- **SSRF prevention:** Restrict Next.js remote image patterns to known domains only (do NOT use `hostname: "**"`)
- **CSRF:** API endpoints use JWT in Authorization header (stateless, no CSRF needed for API calls). Form submissions use Next.js built-in CSRF protection.

### Authentication Security

- **Password hashing:** bcrypt with cost factor 12
- **Password policy:** NIST SP 800-63B -- minimum 8 characters, no composition rules, check against Have I Been Pwned breached password list
- **Access tokens:** Short-lived (15 min), stored in memory (NOT localStorage)
- **Refresh tokens:** Stored in HTTP-only, Secure, SameSite cookies; stored in database; rotated on use; revokable
- **JWT secrets:** No default values; production MUST fail to start without explicit secrets (minimum 32 characters)
- **OAuth scopes:** Minimize -- only request email and profile info

### Content Safety

- **CSAM detection:** All uploaded images MUST be scanned before storage/serving. This is a legal requirement, not optional. Integrate PhotoDNA, Thorn's Safer, or cloud provider equivalent before launch.
- **Image upload restrictions:** Restrict file types (JPEG, PNG, WebP, GIF), maximum file size (5-10MB), and validate MIME types server-side
- **AI content safety:** All AI-generated content must pass content moderation filter before being shown to the owner. Owner must approve before publication.
- **AI prompt injection prevention:** System prompts are server-side only. User input sent to Claude is sanitized. System prompt includes instruction to refuse harmful content generation.
- **Animal welfare:** "Animal abuse/welfare" is a distinct report category with priority moderation queue.

### Data Privacy

- **Data minimization:** Only collect data that's necessary
- **Right to deletion:** Implement account deletion that cascades through all user data, dogs, and medical records (GDPR)
- **Block:** Owners can block other owners (prevents all interaction between all their dogs, bidirectional)
- **Medical data privacy:** All medical records private by default. Sharing requires explicit owner action (generate link). Share links are time-limited and revocable.
- **Location privacy:** All location features opt-in. Nearby dogs uses neighborhood-level precision. Exact GPS only for check-ins and lost dog alerts. Location history NOT stored.
- **Pet data under GDPR:** Pet data linked to an identifiable owner is considered personal data under GDPR.
- **Terms of Service and Privacy Policy:** Must be drafted before launch
- **OAuth data:** Minimize scopes; do not request access to contacts, repositories, etc.

### Infrastructure Security

- **Environment variables:** All secrets in `.env` files, never committed to git
- **Database access:** Restrict to application servers only (no public access)
- **HTTPS only:** Enforce TLS everywhere
- **Dependency scanning:** Regular `npm audit` and Dependabot/Renovate for updates
- **Logging:** Log auth events, moderation actions, and admin operations for audit trails

### Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-19 | Initial architecture guide |
| 1.1 | 2026-02-19 | Aligned with PRD v1.1: simplified MVP to single Next.js app, SSE for notifications, deferred DMs/Socket.io/Redis to v1.1, simplified moderation to report+review+CSAM, updated auth flow to custom JWT with HTTP-only cookies, updated scaling phases, added CSAM/SSRF/NIST security requirements |
| 2.0 | 2026-02-19 | Dog platform pivot: added AI Dog Agent Architecture section (Claude API, system prompts, rate limiting, content safety pipeline), Medical Data Architecture section (privacy, encryption, share links, vaccination reminders), Location System section (earthdistance, park check-ins, lost dog alerts, precision levels), updated Social Graph to dog-to-dog follows with breed-based suggestions and combined owner feed, updated API design with dog/medical/AI/parks/alerts namespaces, updated notification types with vaccination reminders and location alerts, updated security with AI prompt injection prevention and medical/location privacy |
