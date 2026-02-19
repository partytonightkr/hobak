# Product Requirements Document (PRD)
## Dog Social Platform — "Commune"

**Version:** 2.0
**Date:** 2026-02-19
**Author:** Product Manager
**Status:** Major Pivot — Dog-centric social platform with AI pet agents

---

## 1. Overview

Commune is a social platform for dog owners where every dog gets a profile, an AI personality agent, and a community. Owners post on behalf of their dogs, share medical records, discover nearby dog parks and meetups, and connect with other dog owners. The platform uses Claude AI to create unique personality agents for each dog based on breed, temperament, and traits.

### 1.1 Vision

Create the definitive social platform for dog owners — where every dog has a voice (via AI), a health record, and a community. Make it easy to share, connect, and keep dogs healthy and social.

### 1.2 Problem Statement

Dog owners lack a dedicated platform that:
- Centers the experience around their dogs, not themselves
- Provides a fun, personality-driven social experience (AI agents that "speak" as the dog)
- Consolidates medical records, vaccination history, and vet information in one place
- Helps find nearby dog parks, meetups, and other dogs for socialization
- Connects owners with similar breeds, training challenges, or local communities

### 1.3 Proposed Solution

A dog-centric social platform with:
- Dog profiles as the primary entity (owners are the account holders, dogs are the stars)
- AI personality agents powered by Claude that respond and post in the dog's "voice"
- Medical data management (vaccinations, vet visits, health records)
- Location sharing for meetups, dog parks, and lost dog alerts
- All standard social features (feed, follows, likes, comments) reframed as dog-to-dog interaction

---

## 2. Target Users

### 2.1 Primary Personas

| Persona | Description | Key Needs |
|---------|-------------|-----------|
| **Single-Dog Owner** | Has one dog, age 25-45, active on social media | Share photos/updates, find dog parks, track vet records, connect with local dog owners |
| **Multi-Dog Owner** | Has 2+ dogs, needs to manage multiple profiles | Easy switching between dog profiles, shared medical dashboard, batch photo uploads |
| **New Dog Parent** | Recently adopted/purchased a dog | Breed-specific advice, vaccination scheduling, training tips, finding local vets |
| **Dog Community Organizer** | Runs dog meetups, breed groups, training classes | Event creation, group management, member communication |

### 2.2 Demographics

- **Age range:** 22-50 (primary: 25-40)
- **Platforms:** Mobile-first (photos are the primary content), desktop web
- **Geography:** Initially English-speaking markets (US, UK, Canada, Australia)
- **Key trait:** Treats their dog as family; willing to spend on pet products/services

---

## 3. Core Features (MVP)

### 3.1 Owner Registration and Dog Profiles

**Description:** Owners create an account, then set up one or more dog profiles. The dog profile is the primary social identity.

**Requirements:**
- Owner account: sign up via email/password or OAuth (Google, Apple)
- One owner can have multiple dog profiles (1:N relationship)
- Dog profile fields:
  - Name (display name)
  - Username (unique @-handle, e.g., @max_the_golden)
  - Breed (searchable dropdown from breed database)
  - Age / date of birth
  - Size (small/medium/large/extra-large)
  - Bio (280 chars, written "as the dog" or by the owner)
  - Avatar photo
  - Cover photo
  - Personality traits (selected during onboarding, used by AI agent): playful, calm, energetic, shy, friendly, stubborn, curious, protective, goofy, independent
  - Temperament notes (free text, e.g., "loves water but scared of thunder")
- Dog profile page shows: posts, followers/following, medical summary, breed info
- Owner can switch between their dog profiles easily (profile switcher)
- Owner profile exists but is secondary — links to their dogs

**User Stories:**
- US-1.1: As a new user, I want to sign up and immediately create my dog's profile.
- US-1.2: As an owner, I want to add multiple dogs to my account.
- US-1.3: As an owner, I want to select my dog's breed, traits, and personality during onboarding.
- US-1.4: As an owner, I want to switch between my dogs' profiles easily.
- US-1.5: As a visitor, I want to see a dog's profile with their photo, breed, and recent posts.

**Acceptance Criteria:**
- Onboarding flow: sign up -> create first dog -> select breed -> select personality traits -> upload photo -> done (under 3 minutes)
- Breed database: 200+ recognized breeds + "mixed/other" option
- Personality traits: select 3-5 from predefined list
- Avatar: max 5MB, JPEG/PNG/WebP, auto-cropped to square
- Username: 3-30 chars, alphanumeric + underscores, globally unique across dogs and owners

---

### 3.2 AI Dog Personality Agent

**Description:** Each dog gets an AI agent powered by Claude that can generate posts, respond to comments, and interact in the dog's unique "voice" based on their breed and personality traits.

**Requirements:**
- AI agent is configured per dog using: breed, personality traits, temperament notes, age, name
- AI-generated content types:
  - Auto-generated captions for photos uploaded by the owner
  - AI-suggested responses to comments on the dog's posts
  - "What would [dog name] say?" — owner can ask the AI to generate a post
- Owner always reviews and approves AI content before it's published (no fully autonomous posting in MVP)
- AI responses should be playful, in-character, and appropriate (no harmful content)
- System prompt per dog constructed from: breed characteristics, selected personality traits, temperament notes, name, age
- Clear "AI-generated" label on all AI-assisted content

**Deferred to v1.1:**
- Fully autonomous AI posting (scheduled, no approval needed)
- AI-to-AI interactions (dogs "chatting" with each other)
- AI personality learning from owner's posting patterns over time
- Voice/audio generation for the dog

**User Stories:**
- US-2.1: As an owner, I want to upload a photo and get an AI-generated caption in my dog's voice.
- US-2.2: As an owner, I want to ask the AI to write a post as my dog.
- US-2.3: As an owner, I want to see AI-suggested replies to comments on my dog's posts.
- US-2.4: As an owner, I want to review and edit AI content before it's published.
- US-2.5: As a viewer, I want to know which content was AI-assisted.

**Acceptance Criteria:**
- AI caption generation completes in under 3 seconds
- AI content is clearly labeled with an indicator (e.g., sparkle icon + "AI-assisted")
- Owner can edit AI suggestions before posting
- AI agent respects content policies (no harmful, offensive, or misleading content)
- System prompt is not visible to other users
- API: Claude API (claude-sonnet-4-6 for speed/cost balance)

---

### 3.3 News Feed with Posts

**Description:** Dogs (via their owners) create posts and browse a feed of content from dogs they follow.

**Requirements:**
- Posts are authored by a dog profile (not the owner directly)
- Create posts with: text (up to 2000 chars), images (up to 4), links, hashtags
- "Post as" selector when owner has multiple dogs
- Feed shows posts from followed dogs, sorted reverse-chronologically
- Infinite scroll pagination
- Post actions: like (paw icon), comment, share/repost, bookmark
- Post visibility: public (default) or followers-only
- Edit posts within 15 minutes; show "edited" indicator
- Delete own posts at any time
- Optional: AI-assisted caption toggle when uploading photos

**User Stories:**
- US-3.1: As an owner, I want to post a photo of my dog with an AI-generated caption.
- US-3.2: As an owner, I want to choose which dog profile to post as.
- US-3.3: As a user, I want to scroll through my feed to see posts from dogs I follow.
- US-3.4: As a user, I want to "paw" (like) a cute dog post.

**Acceptance Criteria:**
- Post creation with AI caption: under 4 seconds (3s AI + 1s post)
- Image upload: max 10MB per image, JPEG/PNG/WebP/GIF
- Feed loads initial 20 posts in under 2 seconds
- "Post as" selector shows all owner's dogs with avatars

---

### 3.4 Follow System (Dog-to-Dog)

**Description:** Dogs follow other dogs. Owners see a combined feed of all their dogs' follows, or can filter by individual dog.

**Requirements:**
- Follow/unfollow any dog with one tap
- Following/followers lists on dog profile (with pagination)
- "Follow back" indicator
- Suggested dogs: staff picks, popular breeds, nearby dogs (if location enabled), recent signups
- Block: prevents all interaction between two dogs' owners

**User Stories:**
- US-4.1: As an owner, I want my dog to follow another dog so I see their posts.
- US-4.2: As an owner, I want to see which dogs follow my dog.
- US-4.3: As an owner, I want to discover dogs near me or of similar breeds.

**Acceptance Criteria:**
- Follow/unfollow reflected immediately (optimistic update)
- Suggestions include breed-based matching when breed data is available
- Combined feed option: show posts from all dogs the owner's dogs follow

---

### 3.5 Likes and Comments

**Description:** Users engage with posts through "paws" (likes) and comments. AI can suggest comment replies.

**Requirements:**
- Like ("paw") a post with one tap; show total paw count
- Comment on a post (text, up to 500 chars)
- Single-level reply threading
- AI-suggested replies: when viewing comments, owner can tap "AI reply" to get a suggested response in the dog's voice
- Delete own comments; post author (dog owner) can delete any comment on their dog's post

**User Stories:**
- US-5.1: As a user, I want to paw a post to show I love it.
- US-5.2: As an owner, I want the AI to suggest a reply to a comment in my dog's voice.

**Acceptance Criteria:**
- Paw action completes optimistically in under 200ms
- AI reply suggestion appears in under 3 seconds
- Comments paginated (20 per page)

---

### 3.6 Dog Medical Records

**Description:** Owners can track their dog's medical information, vaccination history, and vet visits. This data can be shared with other owners or exported.

**Requirements:**
- Medical dashboard per dog profile
- Record types:
  - Vaccinations: name, date administered, next due date, vet/clinic name
  - Vet visits: date, reason, diagnosis, treatment notes, cost (optional)
  - Medications: name, dosage, frequency, start/end dates
  - Weight log: weight, date (for growth tracking)
  - Allergies: allergen, severity, notes
- Vaccination reminders: in-app notification when a vaccination is coming due
- Sharing: owner can generate a shareable link to their dog's vaccination record (e.g., for doggy daycare, boarding, dog parks)
- Data export: download medical records as PDF
- All medical data is private by default — only visible to the owner unless explicitly shared

**Deferred to v1.1:**
- Vet integration API (direct data pull from veterinary systems)
- AI-powered health insights (e.g., "Based on breed and age, consider discussing X with your vet")
- Medication reminders with push notifications

**User Stories:**
- US-6.1: As an owner, I want to log my dog's vaccinations so I don't forget when they're due.
- US-6.2: As an owner, I want to record vet visits with notes so I have a complete history.
- US-6.3: As an owner, I want to share my dog's vaccination record with a boarding facility.
- US-6.4: As an owner, I want to track my dog's weight over time.
- US-6.5: As an owner, I want to be reminded when a vaccination is coming due.

**Acceptance Criteria:**
- Medical dashboard loads in under 1 second
- Shareable vaccination link is read-only and can be revoked by the owner
- PDF export includes all recorded medical data for the selected dog
- Weight log displays as a simple chart/graph
- Vaccination reminders fire 2 weeks and 1 week before due date

---

### 3.7 Location Sharing

**Description:** Dogs can share their location for meetups, finding nearby dog parks, and lost dog alerts.

**Requirements:**
- Location features:
  - Dog park finder: map view with nearby dog parks (using public park data or user-submitted)
  - "I'm at the park!" check-in: owner can check in at a dog park so friends know they're there
  - Nearby dogs: see which followed dogs are nearby (requires both owners to opt-in)
  - Lost dog alert: owner can flag their dog as lost, broadcasting location last seen + photo + description to nearby users
- Location is always opt-in (disabled by default)
- Location precision: neighborhood-level for nearby dogs (not exact GPS), exact for check-ins and lost dog alerts
- Lost dog alerts are public and do not require following

**Deferred to v1.1:**
- Dog park reviews and ratings
- Dog-friendly business directory (restaurants, hotels, etc.)
- Meetup event scheduling with RSVP
- Real-time location tracking for walks

**User Stories:**
- US-7.1: As an owner, I want to find dog parks near me on a map.
- US-7.2: As an owner, I want to check in at a park so my friends know I'm there.
- US-7.3: As an owner, I want to see if any dogs I follow are nearby.
- US-7.4: As an owner, I want to create a lost dog alert if my dog goes missing.

**Acceptance Criteria:**
- Dog park map loads in under 2 seconds
- Check-in expires after 3 hours (auto-checkout)
- Nearby dogs shows dogs within 2km radius (configurable)
- Lost dog alert reaches all users within 10km of last seen location
- Location permissions requested only when user accesses location features (not on signup)

---

### 3.8 Notifications

**Description:** In-app notifications for social activity and medical reminders.

**Requirements:**
- In-app notification feed
- Notification types: new follower, paw (like), comment, reply, mention, repost, vaccination reminder, nearby dog alert, lost dog alert
- Mark as read (individual or all)
- Unread count badge in navigation

**Deferred to v1.1:**
- Push notifications
- Notification grouping
- Per-type preferences

**Acceptance Criteria:**
- Notifications appear within 5 seconds of triggering event
- Notification feed paginated (30 per page)
- Vaccination reminders appear at 2 weeks and 1 week before due date

---

### 3.9 Search

**Description:** Search for dogs, owners, and breeds.

**Requirements:**
- Search by dog name, username, or breed
- Auto-complete suggestions
- Breed filter: browse dogs by breed
- Results paginated

**Deferred to v1.1:**
- Full-text post search
- Hashtag search and trending
- Location-based search ("dogs near me")

**Acceptance Criteria:**
- Results return in under 500ms
- Auto-complete after 2+ characters
- Breed filter shows breed name + count of dogs registered

---

### 3.10 Content Moderation

**Description:** Basic moderation tools adapted for a dog community.

**Requirements:**
- Report content: posts, comments, profiles (reasons: spam, harassment, inappropriate content, animal abuse/welfare concern, other)
- Admin report queue with actions: remove content, warn user, suspend user, ban user
- CSAM detection on all uploaded images (legal requirement)
- AI content moderation: AI-generated posts/replies must pass content policy check before being shown to owner for approval

**User Stories:**
- US-10.1: As a user, I want to report content that shows animal abuse or welfare concerns.
- US-10.2: As a moderator, I want to prioritize animal welfare reports.

**Acceptance Criteria:**
- Report includes reason category with "animal abuse/welfare" as a distinct option
- Moderation actions take effect immediately
- All uploaded images scanned for CSAM before storage

---

## 4. Premium Features

### 4.1 Verified Dog Badges

- "Verified good boy/girl" badge on profile and posts
- Manual review to confirm dog is real (not a fake/spam profile)
- Available to premium subscribers

### 4.2 Enhanced AI Agent

- More AI interactions per day (free tier: 10/day, premium: unlimited)
- AI personality customization with more traits and fine-tuning
- AI-generated weekly recap posts ("This week in [dog name]'s life")

### 4.3 Medical Analytics

- Health trend analysis across weight, vet visits, medications
- Breed-specific health benchmarks
- Exportable health reports for vets

### 4.4 Priority Support + Ad-Free

- Priority support queue (< 4 hour response)
- No ads in feed

### 4.5 Pricing

| Tier | Price | Features |
|------|-------|----------|
| Free | $0/mo | All core features, 10 AI interactions/day, ad-supported |
| Premium | $9.99/mo or $99/yr | Unlimited AI, verified badge, medical analytics, priority support, ad-free |

---

## 5. Deferred Features (v1.1 Backlog)

| Feature | Reason for Deferral | Estimated Effort |
|---------|---------------------|------------------|
| **Direct Messaging** (owner-to-owner) | Complex real-time infrastructure | 2-3 weeks |
| **Autonomous AI posting** (scheduled, no approval) | Trust/safety concerns need resolution first | 1-2 weeks |
| **AI-to-AI interactions** | Novel feature, needs careful design | 2-3 weeks |
| **Push Notifications** | APNs/FCM integration | 1 week |
| **Dog park reviews/ratings** | Content moderation overhead | 1 week |
| **Meetup event scheduling** | Calendar/RSVP system | 1-2 weeks |
| **Vet system integration** | Third-party API partnerships needed | 3-4 weeks |
| **AI health insights** | Requires veterinary data validation | 2-3 weeks |
| **Post/Hashtag Search** | Full-text indexing infrastructure | 1 week |

---

## 6. Technical Requirements

### 6.1 Performance

- Page load: < 2 seconds (P95)
- API response: < 500ms (P95)
- AI generation: < 3 seconds (P95)
- Image upload: < 5 seconds for 5MB file
- Map/location: < 2 seconds to load

### 6.2 Scalability

- Design for 100 concurrent users at launch; scale to 1,000+ without rewrite
- CDN for static assets and media
- AI API calls should be queued/rate-limited to manage Claude API costs

### 6.3 Security

- All v1.1 security requirements carry forward (TLS, NIST passwords, CSRF/XSS, rate limiting, CSAM detection, SSRF prevention)
- Medical data encrypted at rest with additional access controls
- Location data: stored with minimal precision needed; exact GPS only for check-ins and lost dog alerts
- AI system prompts must not be extractable by users (prompt injection prevention)
- Shareable medical links use unguessable tokens with expiration

### 6.4 Privacy & Compliance

- All v1.1 compliance requirements carry forward (GDPR, CCPA, COPPA, WCAG)
- Medical data: owner-controlled sharing, explicit consent for each share
- Location data: opt-in only, clear permission dialogs, ability to revoke at any time
- AI content: clearly labeled, owner always has final approval
- Pet data is considered personal data under GDPR (linked to identifiable owner)

### 6.5 Platform Support

- Same as v1.1: Chrome, Firefox, Safari, Edge (last 2 versions), PWA, responsive 320px-2560px

---

## 7. Data Models (High-Level)

### 7.1 New MVP Entities (added in v2.0)

- **Dog**: id, owner_id (FK to User), name, username (unique), breed, date_of_birth, size (enum: small/medium/large/xl), bio, avatar_url, cover_url, personality_traits (string[]), temperament_notes, is_verified, follower_count, following_count, created_at, updated_at
- **DogAIConfig**: id, dog_id (FK to Dog), system_prompt (generated from traits), model_id, interactions_today, last_interaction_at, created_at, updated_at
- **Vaccination**: id, dog_id, name, date_administered, next_due_date, vet_name, notes, created_at
- **VetVisit**: id, dog_id, date, reason, diagnosis, treatment_notes, cost, created_at
- **Medication**: id, dog_id, name, dosage, frequency, start_date, end_date, notes, created_at
- **WeightLog**: id, dog_id, weight_kg, date, created_at
- **Allergy**: id, dog_id, allergen, severity (mild/moderate/severe), notes, created_at
- **MedicalShareLink**: id, dog_id, token (unique, unguessable), expires_at, created_at, revoked_at
- **DogPark**: id, name, latitude, longitude, address, submitted_by_user_id, verified, created_at
- **ParkCheckIn**: id, dog_id, park_id, checked_in_at, checked_out_at
- **LostDogAlert**: id, dog_id, last_seen_latitude, last_seen_longitude, last_seen_at, description, status (active/found/cancelled), created_at, resolved_at

### 7.2 Modified Existing Entities

- **User**: add has_dogs boolean, primary_dog_id (optional FK to Dog for default posting)
- **Post**: add dog_id (FK to Dog, nullable for backward compat), ai_assisted (boolean), ai_model_used (string, nullable)
- **Follow**: change to dog-to-dog: follower_dog_id, following_dog_id (instead of user-to-user)
- **Like**: add dog_id (FK to Dog) -- likes are from dogs, not users
- **Comment**: add dog_id (FK to Dog) -- comments are from dogs
- **Notification**: add dog_id context for dog-specific notifications
- **Report**: add "animal_abuse" to reason_category enum

### 7.3 Unchanged Entities

- **Subscription**: unchanged (tied to owner/User, not dog)
- **Bookmark**: unchanged (tied to owner/User -- personal curation)
- **Session, VerificationToken, Account**: unchanged (auth infrastructure)

### 7.4 v1.1 Entities

- **Message/Conversation**: deferred (DMs)
- **DogParkReview**: deferred
- **MeetupEvent**: deferred

---

## 8. API Design Principles

- All v1.1 API principles carry forward
- New endpoint namespaces:
  - `/api/v1/dogs` -- dog CRUD, profile management
  - `/api/v1/dogs/:id/medical` -- vaccination, vet visits, medications, weight, allergies
  - `/api/v1/dogs/:id/ai` -- AI agent interactions (generate caption, suggest reply, generate post)
  - `/api/v1/parks` -- dog park finder, check-ins
  - `/api/v1/alerts` -- lost dog alerts
  - `/api/v1/medical-shares` -- shareable medical links
- AI endpoints should include rate limiting per dog (10/day free, unlimited premium)
- Location endpoints require explicit location permission header

---

## 9. AI Agent Design

### 9.1 System Prompt Construction

Each dog's AI agent uses a system prompt built from:
```
You are {dog_name}, a {age}-year-old {breed}.
Your personality traits: {traits}.
Temperament: {temperament_notes}.
You speak in first person as a dog. You are {trait-specific behaviors}.
Keep responses short (1-3 sentences), playful, and in character.
Never generate harmful, offensive, or misleading content.
```

### 9.2 AI Interaction Types

| Type | Input | Output | Rate Limit |
|------|-------|--------|------------|
| Photo caption | Image + dog context | 1-2 sentence caption | Counts toward daily limit |
| Post generation | Topic/prompt from owner | Full post text (up to 280 chars) | Counts toward daily limit |
| Comment reply suggestion | Comment text + dog context | 1-2 sentence reply | Counts toward daily limit |

### 9.3 Content Safety

- All AI outputs pass through content policy filter before showing to owner
- Owner must approve before any AI content is published
- AI-generated content clearly labeled in UI
- System prompt is server-side only; never exposed to client

---

## 10. Success Metrics

### 10.1 Engagement

| Metric | Target (3 months post-launch) |
|--------|-------------------------------|
| Daily Active Users (DAU) | 5,000 |
| Dogs registered | 8,000+ |
| AI interactions per day | 15,000+ |
| Posts created per DAU | > 0.5 |
| Medical records logged | 2,000+ |

### 10.2 Growth

| Metric | Target |
|--------|--------|
| Monthly signups | 3,000+ |
| Dogs per owner (avg) | 1.3 |
| 7-day retention | > 50% |
| 30-day retention | > 30% |

### 10.3 Revenue

| Metric | Target |
|--------|--------|
| Premium conversion | > 5% (higher than generic social due to niche value) |
| MRR at month 6 | $5,000+ |
| Churn rate (premium) | < 4% monthly |

---

## 11. Milestones

| Phase | Scope | Timeline |
|-------|-------|----------|
| **MVP (v2.0)** | Dog profiles, AI agent, feed, follows, likes/comments, medical records, location/parks, notifications, search, moderation | 6-7 weeks |
| **v2.1** | DMs, push notifications, dog park reviews, meetup events, autonomous AI posting | +4 weeks |
| **v2.2** | Native mobile apps, vet integrations, AI health insights | +6 weeks |
| **v3.0** | Marketplace (dog services/products), breed communities, international | +8 weeks |

---

## 12. Resolved Decisions (carried from v1.1)

All v1.1 resolved decisions remain in effect:
- DMs deferred, SSE for real-time, custom JWT auth, no Redis, NIST passwords, chronological feed, design for 100 concurrent users

New v2.0 decisions:

| Decision | Resolution | Rationale |
|----------|-----------|-----------|
| AI model | claude-sonnet-4-6 | Best speed/cost/quality balance for short-form content |
| AI approval flow | Owner must approve all AI content | Trust/safety; autonomous posting deferred to v2.1 |
| AI rate limit (free) | 10 interactions/day | Controls API cost; premium removes limit |
| Medical data storage | Encrypted at rest, owner-controlled sharing | Sensitive data requires explicit consent |
| Location precision | Neighborhood for "nearby", exact for check-ins/alerts | Balance privacy with utility |
| Follow model | Dog-to-dog (not owner-to-owner) | Dogs are the primary social entity |
| Post authorship | Posts belong to dogs, not owners | Reinforces dog-centric identity |

---

## 13. Open Questions

1. Should we allow dogs to have their own "bark" sound for notifications? (Fun but complex)
2. How do we handle dogs that pass away? (Memorial mode? Archive profile?)
3. Should medical data be interoperable with any pet health standard (e.g., HL7 FHIR for veterinary)?
4. Do we need breed verification (e.g., DNA test upload)?
5. How to handle AI content that owners find doesn't match their dog's personality? (Retraining/refinement flow)
6. Should lost dog alerts integrate with local animal control databases?

---

## 14. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI generates inappropriate content | High | Owner approval required; content policy filter; clear AI labels |
| Claude API costs at scale | High | Rate limiting (10/day free); use claude-sonnet-4-6 not opus; cache common breed prompts |
| Medical data liability | High | Clear disclaimer: "Not a substitute for veterinary advice"; data accuracy is owner's responsibility |
| Location privacy concerns | High | Opt-in only; neighborhood-level precision; clear privacy controls |
| Animal welfare misuse | Medium | Dedicated "animal abuse" report category; priority moderation queue for welfare reports |
| Low initial content | Medium | Seed with dog breed info, dog park data; invite dog influencer accounts for beta |
| CSAM/illegal content | Critical | CSAM detection on all uploads before storage (carried from v1.1) |
| AI prompt injection | Medium | System prompts server-side only; input sanitization on all user text sent to AI |

---

## 15. What Stays from v1.1

The following existing infrastructure is fully reusable:
- Authentication (custom JWT, OAuth, refresh token rotation)
- Payment/subscription system (Stripe)
- Deployment pipeline (Docker, CI/CD)
- Security middleware (CSP, CORS, rate limiting, input sanitization)
- Moderation infrastructure (report queue, admin actions)
- Notification system (in-app feed)
- Core UI components (buttons, forms, cards, layouts)

---

## 16. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-19 | Initial PRD (generic social app) |
| 1.1 | 2026-02-19 | Scope cuts, security hardening, resolved decisions |
| 2.0 | 2026-02-19 | MAJOR PIVOT: Dog-centric social platform with AI personality agents, medical records, location sharing. Complete persona/feature overhaul while preserving social and technical infrastructure. |

---

*This document is a living artifact. See /Users/fm.jakechoi/social-app/docs/CRITIQUE.md for the Devil's Advocate review (to be updated for v2.0).*
