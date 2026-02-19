# Tech Stack Recommendations

> Commune — Dog Social Platform Technology Selection Guide
> **Version:** 2.0 (Updated 2026-02-19 to align with PRD v2.0 dog platform pivot)

This document outlines the recommended technology stack for Commune, a dog-centric social platform with AI personality agents, medical records, and location sharing. Items are marked **MVP** or **v2.1+** to indicate when they apply.

---

## Summary Table

| Layer | MVP Technology | v2.1+ Technology | Version |
|-------|--------------|------------------|---------|
| Frontend Framework | Next.js (App Router) | Same | 14+ |
| UI Library | React | Same | 18+ |
| Language | TypeScript | Same | 5.x |
| Styling | Tailwind CSS | Same | 3.x |
| Backend | Next.js API Routes (Route Handlers) | Evaluate separate backend if needed | 14+ |
| Database | PostgreSQL | Same | 16+ |
| ORM | Prisma | Same | 5.x |
| AI Engine | Claude API (claude-sonnet-4-6) | Same | Latest SDK |
| Real-time | Server-Sent Events (SSE) | Socket.io 4.x (when DMs ship) | - |
| Authentication | Custom JWT (bcrypt + jsonwebtoken) | Same | - |
| Payments | Stripe | Same | Latest SDK |
| File Storage | Local FS | S3-compatible + CDN | - |
| Caching | PostgreSQL (no separate cache) | Redis 7.x (when needed) | - |
| Search | PostgreSQL ILIKE + pg_trgm | PostgreSQL tsvector / Meilisearch | - |
| Maps/Location | Leaflet + OpenStreetMap | Mapbox GL JS (if budget allows) | - |
| Containerization | Docker + docker-compose | Same | - |
| Testing | Jest + React Testing Library | Same | - |

---

## Frontend

### Next.js 14+ with App Router

**Why:** Next.js is the leading React meta-framework and provides critical features out of the box that a social app needs:

- **Server-Side Rendering (SSR):** Social feeds and profiles need to be fast on first load and SEO-friendly. Next.js App Router uses React Server Components by default, which means less JavaScript shipped to the client and faster time-to-interactive.
- **File-based routing:** The App Router's nested layout system maps naturally to a social app's UI hierarchy (e.g., shared navigation, profile layouts, settings sections).
- **API Routes:** Next.js Route Handlers can serve as a lightweight BFF (Backend for Frontend) layer, reducing the need for a separate API gateway.
- **Image Optimization:** Built-in `next/image` handles responsive images, lazy loading, and format conversion -- essential for a media-heavy social app.
- **Streaming and Suspense:** Server Components support streaming, so the feed shell can render immediately while individual posts load progressively.
- **Middleware:** Edge middleware enables fast redirects, auth checks, and A/B testing without hitting the origin server.

**Alternatives considered:**
- **Remix:** Strong data-loading model, but smaller ecosystem and community. Good choice if nested routing and progressive enhancement are top priorities.
- **Vite + React SPA:** Simpler setup, but lacks SSR out of the box. Social apps benefit heavily from server rendering for SEO and perceived performance.
- **SvelteKit:** Excellent performance and DX, but the React ecosystem is significantly larger for UI component libraries, hiring, and community support.

### React 18+

**Why:** React 18 introduces concurrent features (Suspense, transitions, streaming SSR) that are essential for smooth feed scrolling and real-time updates. The ecosystem is unmatched: virtually every UI component, animation library, and state management tool supports React.

### TypeScript 5.x

**Why:** TypeScript provides compile-time type safety across the full stack. For a social app with complex data models (users, posts, comments, messages, notifications), type safety prevents entire categories of bugs. Prisma generates TypeScript types from the database schema, creating end-to-end type safety from DB to UI.

**Key benefits for this project:**
- Shared type definitions between frontend and backend
- Prisma-generated types match the database schema exactly
- IDE autocompletion speeds up development
- Refactoring is safer across a large codebase

### Tailwind CSS 3.x

**Why:** Tailwind provides utility-first CSS that scales well in component-based architectures:

- **Consistency:** Design tokens (colors, spacing, typography) are configured once in `tailwind.config.js` and enforced everywhere.
- **Performance:** Tailwind purges unused CSS in production, resulting in very small CSS bundles.
- **Rapid prototyping:** Building UI is fast without context-switching between CSS files.
- **Dark mode:** Built-in dark mode support via `dark:` variant, which users expect from modern social apps.

**Alternatives considered:**
- **CSS Modules:** Better encapsulation but slower development velocity and no built-in design system.
- **Styled Components / Emotion:** Runtime CSS-in-JS has performance overhead. Styled Components also conflicts with React Server Components.
- **Panda CSS / Vanilla Extract:** Zero-runtime CSS-in-JS alternatives, but smaller ecosystems.

---

## Backend

### MVP: Next.js API Routes (Route Handlers)

**Why (revised from v1.0):** With DMs deferred to v1.1, the MVP has no WebSocket requirement. Next.js Route Handlers provide a complete backend for MVP:

- **Single deployment:** One application, one process, no CORS configuration, shared authentication context.
- **Persistent process:** Running `next start` on Docker/Railway/Fly.io gives a persistent Node.js process -- there is no Vercel-specific serverless constraint.
- **Full capabilities:** Route Handlers support Prisma queries, file uploads (via formidable/busboy), middleware patterns, and SSE for real-time notifications.
- **Simpler auth:** JWT verification happens in the same process as page rendering, eliminating the need to share tokens across services.

**When to add a separate backend (v1.1+):**
- When DMs ship and WebSocket connections require a persistent, independently scalable server
- When background job processing needs its own process (image processing, email sending)
- When mobile clients need an API that's independent of the Next.js app

**v1.1+ Backend: Express.js or Fastify**
When a separate backend is needed, Express.js remains a solid choice for its mature middleware ecosystem. Fastify is a strong alternative if performance is a priority.

### Project Structure (MVP)

```
client/
  src/
    app/
      api/             # Next.js Route Handlers (the API)
        auth/
        posts/
        users/
        notifications/
        search/
        subscriptions/
      (auth)/           # Auth pages (login, register)
      (main)/           # Authenticated app pages
    lib/               # Shared utilities, Prisma client, auth helpers
    services/          # Business logic layer
    middleware.ts      # Next.js middleware (auth checks, rate limiting)
  prisma/
    schema.prisma
    migrations/
```

> **Note:** The current codebase has a separate `server/` directory with Express. Per PRD v1.1, the team should evaluate consolidating into Next.js Route Handlers. If the Express backend is retained, it should be justified by a concrete need (WebSockets, background processing, independent scaling).

---

## Database

### PostgreSQL 16+

**Why:** PostgreSQL is the best choice for a social app's data storage needs:

- **Relational integrity:** Social graphs (follows, friendships), posts with comments, and user profiles are inherently relational. PostgreSQL enforces foreign keys, constraints, and data integrity that prevent orphaned records and inconsistent state.
- **JSONB columns:** For flexible metadata (user preferences, post attachments, notification payloads), JSONB columns provide schema-flexible storage with indexing support -- no need for a separate document database.
- **Full-text search:** PostgreSQL's `tsvector`/`tsquery` with GIN indexes provides competent full-text search for an MVP, eliminating the need for a separate search service initially.
- **Performance at scale:** With proper indexing, PostgreSQL handles millions of rows efficiently. Partitioning, read replicas, and connection pooling (PgBouncer) provide clear scaling paths.
- **LISTEN/NOTIFY:** Built-in pub/sub can trigger real-time events without polling, useful for notification delivery.
- **Mature ecosystem:** Excellent tooling, monitoring (pg_stat_statements), and operational knowledge available.

**Alternatives considered:**
- **MySQL:** Comparable for basic use cases, but PostgreSQL has superior JSONB support, full-text search, and advanced features (CTEs, window functions) needed for feed queries.
- **MongoDB:** Document model is flexible for rapid prototyping, but social data is highly relational. Joins, transactions, and referential integrity are painful in MongoDB.
- **CockroachDB / YugabyteDB:** Distributed PostgreSQL-compatible databases, but overkill for MVP. Consider when scaling beyond a single region.

### Prisma ORM 5.x

**Why:** Prisma provides the best developer experience for TypeScript + PostgreSQL:

- **Type-safe queries:** Every query is fully typed based on the schema. No raw SQL mistakes, no missing fields.
- **Auto-generated migrations:** Schema changes produce SQL migrations automatically, with a clear migration history.
- **Prisma Studio:** Built-in GUI for browsing and editing data during development.
- **Relation handling:** Prisma makes joins, nested creates, and eager loading intuitive with its query API.
- **Raw SQL escape hatch:** When Prisma's query builder is insufficient (e.g., complex feed queries with CTEs), raw SQL with `$queryRaw` is available with type-safe results.

**Alternatives considered:**
- **Drizzle ORM:** More SQL-like syntax, lighter weight, and faster at runtime. Strong alternative if the team prefers writing SQL-adjacent code. Lacks Prisma Studio.
- **TypeORM:** Older, more bugs, less type safety. Decorator-based approach conflicts with modern TypeScript patterns.
- **Knex.js:** Query builder, not a full ORM. Good for complex queries but requires more boilerplate for basic CRUD.
- **Raw SQL with pg:** Maximum control but no type safety, no migration tooling, and significantly more code to write and maintain.

---

## Real-time Communication

### MVP: Server-Sent Events (SSE)

**Why (revised from v1.0):** With DMs deferred to v1.1, the only real-time need in MVP is pushing notifications to connected clients. SSE handles this with zero additional dependencies:

- **Built into HTTP:** SSE is a standard browser API (`EventSource`). No extra client library needed.
- **One-directional is sufficient:** Notifications flow server-to-client only. The client sends actions via regular HTTP POST requests.
- **Works with Next.js Route Handlers:** An SSE endpoint is just a Route Handler that returns a `ReadableStream` with `text/event-stream` content type.
- **No infrastructure overhead:** No Redis adapter, no sticky sessions, no separate WebSocket server.
- **Automatic reconnection:** The browser's `EventSource` API handles reconnection with `Last-Event-ID` for missed events.

**SSE implementation pattern:**
```typescript
// app/api/notifications/stream/route.ts
export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        controller.enqueue(`data: ${data}\n\n`);
      };
      // Subscribe to notification events for this user
      // Send events as they occur
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
```

### v1.1+: Socket.io 4.x (When DMs Ship)

When direct messaging ships in v1.1, Socket.io becomes necessary for:
- Bidirectional messaging (send + receive)
- Typing indicators and read receipts
- Room-based conversation management
- Presence tracking (online/offline status)

Socket.io will require:
- A separate backend process (Express or standalone server)
- Redis adapter (`@socket.io/redis-adapter`) for horizontal scaling
- JWT-based handshake authentication

**Alternatives considered:**
- **Native WebSocket API (ws):** Lower-level, no automatic fallback, no built-in rooms. More code for the same features.
- **Pusher / Ably:** Managed real-time services. Easier to operate but add cost and vendor lock-in.

---

## Authentication

### Custom JWT with bcrypt + jsonwebtoken

**Why (revised from v1.0):** The team has built a custom JWT auth system. Per PRD v1.1, the project must commit to ONE auth approach -- not both Auth.js and custom JWT. The custom implementation is already functional, so we are committing to it.

**What's implemented:**
- Email/password registration with bcrypt (cost factor 12)
- Custom JWT access tokens (short-lived, 15 minutes)
- Custom JWT refresh tokens (longer-lived, 7 days)
- OAuth support via manual provider integration (Google, GitHub, Apple)
- JWT middleware for route protection
- zod validation on all auth inputs

**Security requirements (per PRD v1.1 and NIST SP 800-63B):**
- Password policy: minimum 8 characters, NO composition rules (no forced uppercase/number/special), check against breached password list (Have I Been Pwned API)
- Refresh tokens MUST be stored in the database and rotated on use (not yet implemented -- critical fix needed)
- Access tokens should be stored in memory (Zustand store), NOT localStorage
- Refresh tokens should use HTTP-only cookies (prevents XSS theft)
- JWT secrets must have no default values; production must fail to start without explicit secrets

**Auth flow (MVP, consolidated Next.js):**
1. User signs up via email/password or OAuth on the Next.js app
2. Server issues short-lived access token + HTTP-only refresh token cookie
3. Client stores access token in memory (Zustand)
4. Access token sent in Authorization header on API requests
5. On 401, client hits `/api/auth/refresh` -- browser sends cookie automatically
6. Server verifies refresh token, rotates it, issues new access + refresh pair

**Why NOT Auth.js:**
The Prisma schema currently includes Auth.js tables (`Account`, `Session`, `VerificationToken`) that are unused dead code. These should be removed. Auth.js was originally recommended but the team built custom auth instead. Switching to Auth.js now would require rewriting the auth layer for unclear benefit.

**Alternatives considered:**
- **Auth.js:** Production-ready with 50+ OAuth providers, but requires rewriting the existing auth code. Better choice if starting fresh.
- **Clerk:** Excellent DX, prebuilt UI, but paid service.
- **Supabase Auth:** Tightly coupled with Supabase ecosystem.

---

## Payments

### Stripe

**Why:** Stripe is the industry standard for subscription-based payments:

- **Subscription management:** Built-in support for recurring billing, trial periods, plan upgrades/downgrades, prorations, and cancellations.
- **Stripe Checkout:** Hosted payment page handles PCI compliance, 3D Secure, and international payment methods without building custom payment forms.
- **Webhooks:** Reliable event delivery for subscription lifecycle events (created, updated, cancelled, payment failed). Essential for syncing subscription state with the app database.
- **Customer Portal:** Stripe-hosted page where users manage their own billing (update card, cancel, view invoices). Saves significant development time.
- **TypeScript SDK:** Fully typed Stripe Node.js library.
- **Test mode:** Complete sandbox environment with test cards for development.

**Integration pattern:**
1. User selects a plan in the app
2. App creates a Stripe Checkout Session via the Express API
3. User completes payment on Stripe's hosted page
4. Stripe sends a webhook to the Express API
5. API updates the user's subscription status in PostgreSQL
6. Next.js reads subscription status from the session/JWT

**Alternatives considered:**
- **Paddle:** Handles sales tax/VAT as merchant of record. Simpler tax compliance but less flexibility.
- **LemonSqueezy:** Similar merchant-of-record model, popular with indie developers.
- **PayPal:** Broader global reach in some markets, but worse developer experience and higher fees.

---

## AI Engine

### Claude API (claude-sonnet-4-6)

**Why:** The Claude API powers per-dog AI personality agents that generate captions, posts, and comment replies in each dog's unique "voice."

**Why claude-sonnet-4-6:**
- Best speed/cost/quality balance for short-form content (1-3 sentence outputs)
- Sub-3-second response time for photo captions and post generation
- Strong instruction following for maintaining consistent dog personality
- Built-in content safety filters align with moderation requirements

**Integration pattern:**
```typescript
// Per-dog system prompt construction
function buildDogPrompt(dog: Dog): string {
  return `You are ${dog.name}, a ${dog.age}-year-old ${dog.breed}.
Your personality traits: ${dog.personalityTraits.join(', ')}.
Temperament: ${dog.temperamentNotes}.
You speak in first person as a dog. Keep responses short (1-3 sentences), playful, and in character.
Never generate harmful, offensive, or misleading content.`;
}

// AI interaction endpoint
async function generateCaption(dogId: string, imageDescription: string) {
  const dog = await getDog(dogId);
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system: buildDogPrompt(dog),
    messages: [{ role: 'user', content: `Write a caption for this photo: ${imageDescription}` }],
  });
  return response.content[0].text;
}
```

**Rate limiting:**
- Free tier: 10 AI interactions per dog per day
- Premium tier: Unlimited
- Server-side tracking in `DogAIConfig.interactionsToday` (reset daily via cron or on first request of the day)
- Rate limit checked before API call to avoid unnecessary Claude API costs

**Cost management:**
- Use `max_tokens: 200` for captions, `max_tokens: 500` for posts (short outputs)
- Cache breed-specific system prompt components (breed characteristics rarely change)
- No streaming needed for short outputs -- simple request/response
- Monitor daily API spend with alerts at 80% budget threshold

**Security:**
- System prompts stored server-side only; never exposed to client
- All AI outputs pass through content moderation filter before showing to owner
- Input sanitization on all user text sent to AI (prevent prompt injection)
- AI-generated content clearly labeled in UI with sparkle icon + "AI-assisted"

**Alternatives considered:**
- **OpenAI GPT-4o-mini:** Comparable speed/cost but Claude's instruction following produces more consistent personality adherence
- **Local/self-hosted models (Llama, Mistral):** Lower cost at scale but requires GPU infrastructure and produces lower quality short-form creative content
- **Fine-tuned models:** Per-dog fine-tuning would be ideal but prohibitively expensive and complex for MVP

---

## Maps and Location

### Leaflet + OpenStreetMap (MVP) / Mapbox GL JS (v2.1+)

**Why a two-phase approach:**

**MVP Phase - Leaflet + OpenStreetMap:**
- Leaflet is the most popular open-source JavaScript map library (40K+ GitHub stars)
- OpenStreetMap tiles are free with attribution (no API key costs for MVP)
- Sufficient for dog park finder, check-in markers, and lost dog alert maps
- ~40KB gzipped -- lightweight for a single-page map component
- React wrapper: `react-leaflet` provides declarative components

**v2.1+ - Mapbox GL JS:**
- WebGL-powered rendering for smooth 60fps map interactions
- Superior mobile performance and gesture handling
- Custom map styles for branded dog park visualization
- Geocoding API for "near me" search queries
- Free tier: 50K map loads/month (sufficient for early growth)

**Key map features for MVP:**
- Dog park markers on map (from user-submitted + public data)
- "I'm at the park!" check-in pins with dog avatar
- Lost dog alert radius visualization (10km circle on map)
- Nearby dogs list (based on last check-in location, not real-time GPS)

**Location data handling:**
- Browser Geolocation API for getting user's position (opt-in only)
- Neighborhood-level precision for "nearby dogs" (round to ~0.01 degree)
- Exact coordinates only for park check-ins and lost dog alerts
- Store as `DECIMAL(9,6)` in PostgreSQL (6 decimal places = ~11cm precision)
- Spatial queries: use PostgreSQL `earthdistance` extension or `PostGIS` for radius search

```sql
-- Find dog parks within 5km using earthdistance extension
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

SELECT *, earth_distance(
  ll_to_earth(latitude, longitude),
  ll_to_earth(:user_lat, :user_lng)
) AS distance_meters
FROM dog_parks
WHERE earth_box(ll_to_earth(:user_lat, :user_lng), 5000) @> ll_to_earth(latitude, longitude)
ORDER BY distance_meters
LIMIT 20;
```

**Alternatives considered:**
- **Google Maps:** Most feature-rich but expensive at scale ($7/1K map loads). Consider if map quality is a key differentiator.
- **MapLibre GL JS:** Open-source fork of Mapbox GL JS. Good if vendor lock-in is a concern.
- **deck.gl:** Overkill for our use case (designed for large-scale data visualization).

---

## File Storage

### Local Filesystem (MVP) / S3-Compatible (Production)

**Why a two-phase approach:**

**MVP Phase - Local Filesystem:**
- Zero external dependencies for development and initial deployment
- Files stored in a `/uploads` directory, served via Express static middleware
- Simple implementation: `multer` for upload handling, filesystem for storage
- Acceptable for a single-server deployment with moderate traffic

**Production Phase - S3-Compatible Storage:**
- Amazon S3 or MinIO (self-hosted S3-compatible) for scalable object storage
- CDN (CloudFront, Cloudflare R2) for global content delivery
- Presigned URLs for direct client-to-S3 uploads, reducing server load
- Image processing pipeline (Sharp.js) for generating thumbnails and optimized formats (WebP, AVIF)

**Migration path:** Write the local filesystem implementation directly for MVP. When S3 is needed (v1.1+), extract a common interface at that point -- the abstraction will be better informed by knowing both implementations.

**Alternatives considered:**
- **Cloudflare R2:** S3-compatible with no egress fees. Excellent production choice.
- **Supabase Storage:** Good if already using Supabase.
- **Firebase Storage:** Tightly coupled with Google Cloud ecosystem.

---

## Caching

### MVP: No Separate Cache (PostgreSQL Only)

**Why (revised from v1.0):** For an MVP targeting ~100 concurrent users, PostgreSQL with proper indexes handles all query patterns efficiently. Adding Redis introduces operational complexity (another service to run, monitor, and connect to) without a measured performance need.

**MVP approach:**
- **Sessions:** Refresh tokens stored in PostgreSQL (a `refresh_tokens` table)
- **Rate limiting:** In-memory store (express-rate-limit's default MemoryStore) for a single-process deployment. Acceptable for MVP.
- **Feed queries:** PostgreSQL with indexes on `(author_id, created_at DESC)` serves chronological feeds fast enough for early-stage traffic
- **Counters:** Atomic `INCREMENT` in PostgreSQL, no caching layer needed

**Known limitations of no-Redis MVP:**
- Rate limiting resets on server restart and doesn't work across multiple instances
- No distributed cache for feed results
- No pub/sub for cross-instance event distribution

### v1.1+: Redis 7.x (When Needed)

Add Redis when any of these become true:
- **Multiple server instances:** Rate limiting and session management need a shared store
- **Socket.io ships:** Redis adapter required for cross-instance WebSocket event broadcasting
- **Feed performance degrades:** Cache computed feed pages in Redis sorted sets
- **Presence tracking needed:** Redis key expiration for online/offline status

Redis use cases at scale:
- Session/refresh token storage (fast lookups, easy invalidation)
- Rate limiting via `rate-limit-redis`
- Socket.io adapter (`@socket.io/redis-adapter`)
- Feed caching with sorted sets
- Pub/sub for notification distribution

---

## Search

### MVP: PostgreSQL ILIKE + pg_trgm (Dog and User Search)

**Why (revised for v2.0):** MVP search includes finding dogs by name, username, or breed, and finding owners by username. This does not require full-text search infrastructure. `ILIKE` with `pg_trgm` provides fast, typo-tolerant search:

```sql
-- Enable trigram extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Dog search indexes
CREATE INDEX idx_dogs_name_trgm ON dogs USING gin (name gin_trgm_ops);
CREATE INDEX idx_dogs_username_trgm ON dogs USING gin (username gin_trgm_ops);
CREATE INDEX idx_dogs_breed_trgm ON dogs USING gin (breed gin_trgm_ops);

-- User search indexes
CREATE INDEX idx_users_username_trgm ON users USING gin (username gin_trgm_ops);
CREATE INDEX idx_users_display_name_trgm ON users USING gin (display_name gin_trgm_ops);

-- Dog search query with breed filter
SELECT id, name, username, breed, avatar_url
FROM dogs
WHERE (name ILIKE '%query%' OR username ILIKE '%query%' OR breed ILIKE '%query%')
ORDER BY similarity(username, 'query') DESC
LIMIT 20;
```

**Breed filter search:**
- Browse dogs by breed: `SELECT breed, COUNT(*) FROM dogs GROUP BY breed ORDER BY count DESC`
- Auto-complete breed dropdown with 200+ recognized breeds

**Why not tsvector for MVP:**
- `tsvector` is designed for document search (posts, articles), not short-string matching
- Dog/user search is name matching, which `ILIKE` + trigrams handle better
- No additional schema complexity (no tsvector columns, no triggers to maintain them)

### v2.1+: PostgreSQL Full-Text Search (Post/Hashtag Search)

When post search and hashtag search ship in v2.1:
- Add `tsvector` columns to the posts table
- Create GIN indexes for full-text search
- Use `ts_rank` for relevance scoring
- Consider Meilisearch if typo tolerance and search analytics are needed

---

## Deployment

### Docker + docker-compose

**Why:** Docker provides consistent, reproducible environments from development to production:

- **Development parity:** `docker-compose up` starts the entire stack (Next.js, Express, PostgreSQL, Redis) with one command. New developers are productive in minutes.
- **Isolation:** Each service runs in its own container with explicit dependencies. No "works on my machine" issues.
- **Scalability path:** Docker images deploy to any container orchestrator (Kubernetes, ECS, Fly.io, Railway).
- **CI/CD integration:** Build and test in Docker containers in CI for consistent results.

**docker-compose services (MVP):**
```yaml
services:
  app:         # Next.js app (includes API routes)
  postgres:    # PostgreSQL database
  # v1.1+:
  # redis:     # Redis cache (when needed)
  # worker:    # Background job processor
```

**Production deployment options:**
- **Railway / Render:** Simplest path to production. Git-push deploys with managed PostgreSQL and Redis. Good for MVP.
- **Fly.io:** Edge deployment with built-in PostgreSQL. Good balance of simplicity and control.
- **AWS ECS / Fargate:** Production-grade container orchestration if scaling demands it.
- **Kubernetes:** Maximum control and scaling, but significant operational overhead. Only justified at large scale.

---

## Testing

### Jest + React Testing Library

**Why:**

- **Jest:** The default testing framework for the JavaScript ecosystem. Fast, parallel test execution. Built-in mocking, code coverage, and snapshot testing.
- **React Testing Library:** Tests components from the user's perspective (clicking buttons, reading text) rather than testing implementation details. Produces tests that survive refactors.
- **Prisma testing:** Jest integrates with Prisma for database testing using test transactions that roll back automatically.

**Testing strategy for this app:**
- **Unit tests:** Business logic (feed generation, permission checks, payment handling)
- **Integration tests:** API route handlers with a test database
- **Component tests:** React components with React Testing Library
- **E2E tests (future):** Playwright for critical user flows (sign up, create post, send message)

**Alternatives considered:**
- **Vitest:** Faster than Jest, native ESM support, compatible API. Strong alternative, especially if using Vite.
- **Playwright:** Better for E2E testing. Plan to add alongside Jest, not replace it.
- **Cypress:** Popular E2E tool but heavier and slower than Playwright for the same tests.

---

## Additional Tooling

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting with TypeScript rules |
| **Prettier** | Code formatting |
| **Husky** | Git hooks for pre-commit linting |
| **lint-staged** | Run linters only on staged files |
| **zod** | Runtime schema validation (API inputs, env vars) |
| **date-fns** | Date manipulation (relative timestamps in feeds) |
| **sharp** | Server-side image processing (thumbnails, optimization) |
| **bull / bullmq** | Background job queue (v1.1+ -- email sending, image processing) |
| **winston / pino** | Structured logging |

---

## Version Compatibility Matrix

Ensure these minimum versions for compatibility:

| Package | Minimum Version | Reason |
|---------|----------------|--------|
| Node.js | 20.x LTS | Required for Next.js 14+ |
| npm | 10.x | Workspaces support |
| PostgreSQL | 16 | Performance improvements, logical replication |
| TypeScript | 5.3+ | Import attributes, `satisfies` operator |
| Redis | 7.x | v1.1+ only -- not needed for MVP |

---

## Decision Log

| Decision | Date | Rationale |
|----------|------|-----------|
| Next.js over Remix | MVP | Larger ecosystem, better SSR defaults, image optimization |
| Next.js Route Handlers over Express | MVP (revised) | Single deployment, no CORS, shared auth; Express only if WebSocket/scaling need arises |
| PostgreSQL over MongoDB | MVP | Social data is relational; JSONB covers flexible needs |
| Prisma over Drizzle | MVP | Better DX for rapid development; Studio for debugging |
| SSE over Socket.io | MVP (revised) | Notifications are server-to-client only; Socket.io deferred to v2.1 with DMs |
| Custom JWT over Auth.js | MVP (revised) | Custom auth already built; Auth.js schema tables are dead code and should be removed |
| No Redis for MVP | MVP (revised) | PostgreSQL handles sessions, rate limiting, and queries at MVP scale |
| ILIKE + pg_trgm over tsvector | MVP (revised) | Dog/user search only in MVP; full-text post search deferred to v2.1 |
| Local filesystem over S3 | MVP | Simplicity; extract storage interface when S3 is needed |
| NIST password policy over composition rules | MVP (revised) | Min 8 chars, no forced complexity, check against breach lists |
| Claude Sonnet 4.6 for AI agent | v2.0 | Best speed/cost/quality balance for short-form dog personality content |
| Owner approval for all AI content | v2.0 | Trust/safety; autonomous AI posting deferred to v2.1 |
| 10 AI interactions/day free tier | v2.0 | Controls Claude API costs; premium removes limit |
| Leaflet + OSM over Google Maps | v2.0 | Free tiles, sufficient for MVP dog park maps; upgrade to Mapbox if needed |
| PostgreSQL earthdistance over PostGIS | v2.0 | Simpler for basic radius queries; PostGIS if advanced spatial features needed |
| Dog-to-dog follows (not user-to-user) | v2.0 | Dogs are the primary social entity per PRD v2.0 |

### Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-19 | Initial tech stack recommendations |
| 1.1 | 2026-02-19 | Aligned with PRD v1.1: consolidated backend to Next.js Route Handlers, SSE over Socket.io, custom JWT over Auth.js, removed Redis from MVP, simplified search to ILIKE + pg_trgm, removed premature StorageService interface, updated NIST password policy |
| 2.0 | 2026-02-19 | Dog platform pivot: added Claude API for AI dog agents, Leaflet + OpenStreetMap for location/maps, PostgreSQL earthdistance for spatial queries, updated search for dog/breed discovery, added AI rate limiting and cost management strategy, added medical data security requirements |
