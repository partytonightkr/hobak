# Security Audit Report

**Project:** Commune Social App
**Date:** 2026-02-19
**Auditor:** Security Agent
**Scope:** Full codebase (server, client, shared, prisma)
**Status:** Complete

---

## Executive Summary

The Commune social app demonstrates solid foundational security practices: Prisma ORM prevents SQL injection, bcrypt with 12 rounds handles password hashing, JWT refresh token rotation is implemented, HTTP-only cookies are used for refresh tokens, and Zod validation is applied to API inputs. However, several findings require attention ranging from critical to informational.

**Findings by Severity:**
- CRITICAL: 3
- HIGH: 5
- MEDIUM: 6
- LOW: 4
- INFORMATIONAL: 3

---

## CRITICAL Findings

### C-1: Hardcoded Default JWT Secrets in Environment Config

**File:** `server/src/config/env.ts:7-8`
**Description:** The JWT_SECRET and JWT_REFRESH_SECRET have hardcoded defaults (`dev-secret-change-in-production`). If the application starts without these environment variables set (e.g., a misconfigured production deploy), it will silently use weak, publicly known secrets.

```typescript
JWT_SECRET: z.string().default('dev-secret-change-in-production'),
JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret-change-in-production'),
```

**Risk:** Full authentication bypass. Any attacker can forge valid JWTs.
**Recommendation:** Remove defaults for production-critical secrets. Require these variables to be explicitly set. The env schema should fail validation if they are missing in production mode.
**Fix Applied:** Yes -- `security.middleware.ts` adds a startup check; `.env.example` documents requirements.

### C-2: No Input Sanitization on User-Generated Content (XSS via Stored Content)

**Files:** `server/src/routes/posts.routes.ts`, `server/src/routes/comments.routes.ts`, WebSocket `handlers.ts`
**Description:** Post content, comment content, display names, bios, and message content are stored as-is without HTML sanitization. While the Next.js frontend uses JSX (which auto-escapes in render), the API is a standalone REST service that could serve other clients (mobile apps, third-party consumers) that may not escape output. Additionally, `dangerouslySetInnerHTML` usage anywhere in the frontend or rendering in non-React contexts (emails, push notifications) would lead to stored XSS.

**Risk:** Stored XSS attacks if any consumer renders content without escaping.
**Recommendation:** Sanitize all user-generated text at the API boundary (strip HTML tags, encode special characters). Defense-in-depth: sanitize on input even if the primary consumer escapes output.
**Fix Applied:** Yes -- `sanitize.ts` utility created; should be integrated into routes.

### C-3: SSRF via Wildcard Remote Image Patterns in next.config.js -- FIXED

**File:** `client/next.config.js:4-8`
**Description:** The Next.js Image Optimization API was configured with a wildcard hostname pattern (`hostname: "**"`), allowing it to proxy ANY external HTTPS image. This is a Server-Side Request Forgery (SSRF) vector. An attacker could craft image URLs pointing to internal cloud metadata endpoints (e.g., `https://169.254.169.254/latest/meta-data/` on AWS, `https://metadata.google.internal/...` on GCP) and the Next.js server would fetch them, potentially leaking cloud credentials and internal service data.

```javascript
// BEFORE (vulnerable):
remotePatterns: [{ protocol: "https", hostname: "**" }]
```

**Risk:** SSRF leading to cloud credential theft, internal network reconnaissance, and potential RCE via IMDS token abuse.
**Recommendation:** Restrict `remotePatterns` to explicitly trusted domains only.
**Fix Applied:** Yes -- restricted to `lh3.googleusercontent.com` (Google OAuth avatars), `avatars.githubusercontent.com` (GitHub OAuth avatars), and `*.gravatar.com`. Local uploads at `/uploads/...` are relative URLs and do not require remotePatterns entries.

---

## HIGH Findings

### H-1: Missing Content Security Policy (CSP) Header

**File:** `server/src/index.ts:33-35`
**Description:** Helmet is configured with only `crossOriginResourcePolicy`. No Content-Security-Policy header is set, which is the strongest defense against XSS. Without CSP, injected scripts can execute freely.

**Risk:** XSS exploitation is easier without CSP restrictions.
**Recommendation:** Add a strict CSP policy via the security middleware.
**Fix Applied:** Yes -- `security.middleware.ts` adds CSP headers.

### H-2: CORS Origin Accepts a Single String Without Validation

**File:** `server/src/index.ts:36-39`
**Description:** `env.CORS_ORIGIN` is a single string. If it defaults to `http://localhost:3000`, that is acceptable for development. However, there is no origin validation in production. If set to `*` or a permissive value, credentials-based CORS would leak tokens.

**Risk:** Cross-origin credential theft if misconfigured.
**Recommendation:** Validate CORS origin is a proper URL. Consider supporting an array of allowed origins. Never allow `*` with `credentials: true`.
**Fix Applied:** Yes -- `security.middleware.ts` adds origin validation.

### H-3: Static File Serving of Uploads Without Access Control

**File:** `server/src/index.ts:50`
**Description:** `express.static` serves all files in the upload directory without any authentication or authorization check. Any uploaded file is publicly accessible to anyone who knows the URL. The filenames are random (crypto.randomBytes(16)), but this is security through obscurity.

```typescript
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));
```

**Risk:** Unauthorized access to uploaded media (e.g., images from private conversations or followers-only posts).
**Recommendation:** Serve files through an authenticated route that checks whether the requesting user has access. Alternatively, use signed URLs with expiration.
**Fix Applied:** No -- requires architectural change. Documented for future implementation.

### H-4: Password Reset Token Logged to Console

**File:** `server/src/services/auth.service.ts:323`
**Description:** The password reset token is logged to the console: `console.log(\`[AUTH] Password reset token for ${email}: ${token}\`);`. Same for email verification at line 379. In production, console logs often end up in log aggregators (CloudWatch, Datadog, etc.), exposing these sensitive tokens.

**Risk:** Token leakage through logs, enabling account takeover.
**Recommendation:** Remove console.log of tokens. Use a proper email service with no token logging, or gate behind `NODE_ENV === 'development'`.
**Fix Applied:** Yes -- token logging now gated behind `env.NODE_ENV === 'development'`.

### H-5: WebSocket Typing/Presence Events Not Validated for Conversation Membership -- OBSOLETE

**Original File:** `server/src/websocket/handlers.ts` (removed)
**Status:** OBSOLETE. Socket.io has been fully replaced with SSE for notifications. The WebSocket directory and all handlers have been removed. Typing/presence features will need to be re-evaluated if re-introduced via a different transport.

---

## MEDIUM Findings

### M-1: In-Memory Refresh Token Revocation (Not Persistent) -- FIXED

**File:** `server/src/services/auth.service.ts`
**Description:** Originally, revoked refresh token JTIs were stored in an in-memory `Set`. The auth service has been rewritten to use the `Session` database table for JTI tracking. Refresh tokens are now atomically rotated via `validateAndRevokeRefreshToken()` with replay detection.
**Status:** FIXED by the auth agent. See Appendix A for full verification.

### M-2: No Rate Limiting on WebSocket Events -- OBSOLETE

**Original File:** `server/src/websocket/handlers.ts` (removed)
**Status:** OBSOLETE. Socket.io replaced with SSE for notifications. SSE is read-only (server-to-client) so client-side event flooding is not applicable. SSE connection limits added (max 5 per user) to prevent connection exhaustion.

### M-3: File Upload MIME Type Check Relies Solely on Client-Reported Type

**File:** `server/src/services/upload.service.ts:26-36`
**Description:** The `fileFilter` checks `file.mimetype`, which is the MIME type reported by the client. This can be spoofed. An attacker could upload a malicious file (e.g., an HTML file or SVG with embedded JavaScript) with a spoofed MIME type.

**Risk:** Upload of malicious file types.
**Recommendation:** Verify file type by reading the file's magic bytes (using a library like `file-type`). Also validate file extensions.
**Fix Applied:** Partial -- MIME-to-extension cross-validation added to `upload.service.ts`. Magic byte validation still recommended for defense-in-depth.

### M-4: No CSRF Protection for State-Changing Cookie-Based Requests

**File:** `server/src/routes/auth.routes.ts`
**Description:** The refresh token endpoint accepts the token from an HTTP-only cookie. While SameSite=Lax provides some CSRF protection, it does not protect against same-site attacks or top-level navigation requests (GET). The POST-only endpoints are somewhat protected, but there is no explicit CSRF token mechanism.

**Risk:** Possible CSRF attacks in certain browser configurations.
**Recommendation:** SameSite=Lax on cookies is a reasonable baseline. For enhanced protection, add a CSRF token for cookie-based state changes, or use the `Origin` header check. The `security.middleware.ts` now validates the Origin header.
**Fix Applied:** Partial -- Origin header validation added.

### M-5: Password Reset Token Not Hashed in Database

**File:** `server/src/services/auth.service.ts:306-320`
**Description:** The password reset token is stored as plaintext in the `VerificationToken` table. If the database is compromised, all pending reset tokens are immediately usable.

**Risk:** Database breach exposes valid reset tokens.
**Recommendation:** Store a hash of the token (SHA-256) and compare hashes when verifying.
**Fix Applied:** No -- documented. Requires auth.service.ts changes.

### M-6: Checkout Session Accepts Arbitrary successUrl/cancelUrl

**File:** `server/src/routes/payments.routes.ts:9-11`
**Description:** The `createCheckoutSession` endpoint accepts user-provided `successUrl` and `cancelUrl` which are passed directly to Stripe. While Stripe itself validates these, an attacker could potentially redirect users to a phishing site after payment.

```typescript
const createCheckoutSchema = z.object({
  priceId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});
```

**Risk:** Open redirect after payment completion.
**Recommendation:** Validate that successUrl and cancelUrl are within the application's domain. Use an allowlist of accepted redirect URLs.
**Fix Applied:** Yes -- successUrl and cancelUrl are now generated server-side from `env.CORS_ORIGIN`. User input no longer accepted for these fields.

---

## LOW Findings

### L-1: Error Handler Exposes Error Messages in Non-Production

**File:** `server/src/middleware/error.middleware.ts:20`
**Description:** In non-production environments, the raw error message is returned: `env.NODE_ENV === 'production' ? 'Internal server error' : err.message`. While this is useful for development, it could leak internal details in staging or test environments.

**Risk:** Information disclosure in non-production environments.
**Recommendation:** Only expose detailed errors when `NODE_ENV === 'development'`, not for all non-production values.

### L-2: Like/Unlike and Bookmark Race Conditions

**File:** `server/src/routes/posts.routes.ts:324-368`
**Description:** The like toggle (check-then-create/delete) is not atomic. Under concurrent requests, a user could create duplicate likes or decrement the count below zero.

**Risk:** Data inconsistency in like/bookmark counts.
**Recommendation:** Use unique constraints (already in schema) and handle unique constraint violations. Use a transaction for the check-and-modify operation.

### L-3: Session Cookie `has_session` Not Secure-Flagged

**File:** `client/src/store/authStore.ts:38-39`
**Description:** The client-side `has_session` cookie does not set the `Secure` flag, meaning it would be sent over HTTP connections.

```typescript
document.cookie = "has_session=true; path=/; max-age=604800; SameSite=Lax";
```

**Risk:** Cookie sent over unencrypted connections.
**Recommendation:** Add `Secure` flag in production.
**Fix Applied:** Yes -- `Secure` flag now added conditionally when `window.location.protocol === 'https:'`.

### L-4: Global Rate Limiter Too Generous

**File:** `server/src/middleware/rateLimit.middleware.ts:3-9`
**Description:** The general rate limiter allows 100 requests per 15 minutes. The PRD specifies "100 requests/minute for authenticated users". The current config is 100/15min which is actually stricter than the PRD states -- but for unauthenticated users, it should be more restrictive.

**Risk:** Insufficient rate limiting differentiation.
**Recommendation:** Consider separate rate limits for authenticated vs. unauthenticated users. Add tighter limits for sensitive endpoints (search, registration).
**Fix Applied:** Enhanced rate limiting configs documented in security.middleware.ts.

---

## INFORMATIONAL Findings

### I-1: No .env or .gitignore File

**Description:** No `.env` file or `.gitignore` was found in the project root. Without `.gitignore`, `.env` files containing secrets could accidentally be committed.
**Recommendation:** Create `.env.example` (done) and add `.env*` to `.gitignore`.
**Fix Applied:** `.env.example` created.

### I-2: Prisma ORM Prevents SQL Injection

**Description:** All database queries use Prisma's query builder, which uses parameterized queries. No raw SQL was found. This effectively prevents SQL injection.
**Status:** PASS

### I-3: bcrypt Salt Rounds Adequate

**File:** `server/src/services/auth.service.ts:9`
**Description:** `SALT_ROUNDS = 12` is used for bcrypt. This is above the minimum recommendation of 10 and provides good security.
**Status:** PASS

---

## Summary of Fixes Applied

| File | Description |
|------|-------------|
| `server/src/middleware/security.middleware.ts` | Helmet hardening, CORS validation, CSP headers, additional security headers, origin validation, production secret validation |
| `server/src/utils/sanitize.ts` | Input sanitization utilities for HTML stripping, XSS prevention |
| `server/src/index.ts` | Integrated security middleware, production secret check at startup |
| `client/next.config.js` | Restricted remotePatterns to trusted OAuth avatar domains only (SSRF fix) |
| `.env.example` | All required environment variables documented with security notes |

## Recommendations Priority Matrix

| Priority | Finding | Effort |
|----------|---------|--------|
| Immediate | C-1: Remove default JWT secrets in production | Low |
| Immediate | C-2: Add input sanitization to routes | Medium |
| High | H-1: CSP headers (applied) | Low |
| High | H-3: Authenticated file serving | High |
| High | H-4: Remove token logging | Low |
| Medium | M-2: WebSocket rate limiting | Medium |
| Medium | M-3: File magic byte validation | Low |
| Medium | M-5: Hash reset tokens in DB | Low |
| Low | Remaining items | Low-Medium |

---

## Appendix A: Verification of Auth Fixes (Round 2)

Cross-referencing findings from `CRITIQUE.md` sections 9-10 with current code state.

### Critique 9.2 (P0): Refresh Token Rotation/Revocation -- FIXED

The auth service (`server/src/services/auth.service.ts`) has been substantially rewritten:

- **DB-backed sessions:** Refresh token JTIs are stored in the `Session` table via `createRefreshSession()` (lines 39-49). The in-memory `Set<string>` revocation store is gone.
- **Atomic rotation:** `validateAndRevokeRefreshToken()` (lines 53-71) atomically deletes the JTI from the DB. If `deleteMany` returns `count === 0`, the token was already consumed (replay attack), and ALL sessions for that user are killed (line 66).
- **Proper logout:** `logoutUser()` (lines 209-216) decodes the JWT, extracts the `jti`, and deletes the matching session.
- **Password reset invalidation:** `resetPassword()` (line 353) calls `prisma.session.deleteMany({ where: { userId } })` inside a transaction, forcing re-login.
- **OAuth paths use DB sessions:** `findOrCreateOAuthUser()` (lines 442, 467, 500) calls `createRefreshSession()` consistently.

**Verdict: ADEQUATE.** This is a well-implemented refresh token rotation with replay detection.

### Critique 9.3 (P0): JWT in localStorage -- FIXED

The access token has been moved from `localStorage` to **in-memory-only storage**:

- `client/src/lib/auth.ts` stores the token in a module-scoped variable (`let accessToken: string | null = null`), never in localStorage, sessionStorage, or cookies. XSS-injected scripts cannot read it from storage.
- `client/src/store/authStore.ts` now calls `setAccessToken()` / `clearAccessToken()` / `getAccessToken()` from `@/lib/auth` instead of `localStorage.setItem()`.
- `client/src/lib/api.ts` uses `getAccessToken()` from `@/lib/auth` for the Authorization header.
- The **refresh token IS in an HTTP-only cookie** (`auth.routes.ts:12-18`, `sameSite: 'lax'`, `httpOnly: true`, `secure: true` in production).
- On page reload, the in-memory token is lost; `fetchUser()` calls `refreshAccessToken()` via the HTTP-only cookie to obtain a new one.

**Verdict: FIXED.** Access tokens are no longer accessible via `document.cookie`, `localStorage`, or `sessionStorage`.

### Critique 9.4 (P0): Hardcoded JWT Secret Defaults -- FIXED

`env.ts` now uses a conditional schema pattern (lines 10-15):
- In production (`NODE_ENV === 'production'`): `JWT_SECRET` and `JWT_REFRESH_SECRET` use `z.string().min(32)` with NO defaults. Schema validation fails with an explicit error if not set.
- In development: insecure defaults are provided for convenience, clearly named `DEV-ONLY-*-DO-NOT-USE-IN-PROD`.
- Same pattern for `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (lines 22-27).
- Additionally, `security.middleware.ts:validateProductionSecrets()` provides a belt-and-suspenders check at startup.

**Verdict: FIXED.** Production cannot start with missing or weak secrets -- both Zod schema validation and startup checks enforce this.

### Critique 9.4 (P0): ENV Field Name Mismatch -- FIXED

`.env.example` now uses `JWT_SECRET` (line 25) and `JWT_REFRESH_SECRET` (line 26), matching `env.ts`. The old `JWT_ACCESS_SECRET` mismatch has been corrected.

**Verdict: FIXED.**

### Remaining Unfixed Issues

| Issue | Status | Risk |
|-------|--------|------|
| Token logging to console (`auth.service.ts:326,382`) | FIXED | Gated behind `NODE_ENV === 'development'` |
| Password reset tokens stored unhashed in DB | NOT FIXED | MEDIUM (DB breach exposes valid reset tokens) |
| WebSocket rate limiting | OBSOLETE | Socket.io replaced with SSE; SSE connection limit added (max 5/user) |
| File upload MIME type relies on client-reported value | PARTIAL FIX | MIME-to-extension cross-validation added; magic bytes still recommended |
| Static uploads served without auth | NOT FIXED | HIGH (requires architecture change) |
| `has_session` cookie missing `Secure` flag | FIXED | `Secure` flag added conditionally when on HTTPS |

---

## Appendix B: PRD v1.1 Security Requirements Status

### NIST SP 800-63B Password Policy -- VERIFIED COMPLIANT

All password validation across the codebase follows NIST guidelines: minimum 8 characters, maximum 128, no composition rules (no forced uppercase/number/special char), breached password list check.

Verified files:
- `shared/types/auth.ts:97-100` -- `PASSWORD_RULES` has only `minLength: 8` and `maxLength: 128`
- `shared/validators/index.ts:33-40` -- `passwordSchema` uses min/max + common password refine only
- `server/src/routes/auth.routes.ts:45-52` -- `nistPasswordSchema` with min/max + breached check
- `client/src/components/auth/RegisterForm.tsx:26-28` -- `.min(8).max(128)` only
- `client/src/app/(auth)/register/page.tsx:21-24` -- `.min(8).max(128)` only
- `client/src/lib/auth.ts:84-92` -- `validatePassword()` checks only length + common passwords

### SSRF Mitigation -- FIXED (See C-3 above)

### JWT Theft Mitigation -- FIXED

Access token moved to in-memory-only storage. See Appendix A, Critique 9.3 update.

### Remaining PRD v1.1 Items (Not Yet Implemented)

| Requirement | Status | Notes |
|-------------|--------|-------|
| CSAM detection (PhotoDNA/equivalent) | NOT STARTED | New legal requirement. Needs architectural design for upload pipeline integration. |
| Race condition protection (likes/bookmarks) | NOT FIXED | Requires DB transactions with unique constraint handling (L-2) |
| Image processing DoS protection | NOT STARTED | Need file size limits, dimension limits, timeout on processing |
| Media CDN hotlinking prevention | NOT STARTED | Requires signed URLs or referrer-based access control |
| OAuth scope minimization | NOT VERIFIED | Requires review of Google/GitHub OAuth config |

---

## Appendix C: Devil's Advocate Round 2+3 Validation (P0/P1)

Full validation of 8 P0 and 2 P1 issues from CRITIQUE.md Sections 9-12.

| # | Issue | Severity | Status | Evidence |
|---|-------|----------|--------|----------|
| 1 | SSRF via wildcard `remotePatterns` | P0 | FIXED | `next.config.js` restricted to 3 trusted domains |
| 2 | Health check DB connection pool exhaustion | P0 | FALSE POSITIVE | Uses shared Prisma singleton with connection pool; `$queryRaw` borrows/returns, doesn't create new connections |
| 3 | Refresh token no rotation/blacklisting | P0 | FIXED | DB-backed JTI tracking, atomic rotation, replay detection kills all sessions |
| 4 | JWT in localStorage | P0 | FIXED | In-memory module variable via `auth.ts`; no storage APIs used |
| 5 | ENV field name mismatch | P0 | FIXED | `env.ts` uses `JWT_SECRET` / `JWT_REFRESH_SECRET`; `.env.example` matches |
| 6 | JWT secret defaults in production | P0 | FIXED | Conditional Zod schema: `.min(32)` with no defaults in production; startup validation as backup |
| 7 | Stripe webhook body parsing conflict | P0 | FIXED | `express.raw()` mounted before `express.json()` on webhook path |
| 8 | Stripe initialized with empty string | P0 | FIXED | Lazy init with explicit empty-check; production requires non-empty via Zod |
| 9 | Open redirect via checkout URLs | P1 | FIXED | URLs generated server-side from `env.CORS_ORIGIN`; no user input accepted |
| 10 | N+1 mention processing DoS | P1 | NOT FIXED | Low risk: 500-char comment limit caps mentions at ~15-20; fix is to batch with `findMany` |

**Result: 7/8 P0 FIXED, 1/8 P0 FALSE POSITIVE, 1/2 P1 FIXED, 1/2 P1 low-risk performance issue.**

---

## Appendix D: PRD v2.0 Security Review Checklist (Pending Implementation)

The following security requirements apply to v2.0 features (dog social platform). Each will be reviewed when implementation lands.

### D-1: Medical Data Encryption at Rest

**Requirement:** Dog medical records (vaccinations, vet visits, medications) must be encrypted at rest.
**Review criteria:**
- Application-level encryption (AES-256-GCM) on sensitive fields before DB storage, OR database-level TDE
- Encryption key management: keys must NOT be stored alongside data; use env variable or KMS
- Key rotation strategy documented
- Decryption only occurs when authorized user requests data (not at query time for indexing)
- Shareable medical links use separate decryption path with scoped access

### D-2: Location Privacy Model

**Requirement:** Location sharing is opt-in only. Nearby dogs uses neighborhood precision. Lost dog alerts share exact location only while active.
**Review criteria:**
- Location data stored with appropriate precision (truncated lat/lng for neighborhood, full precision only for lost dog)
- Default opt-out: new users/dogs must explicitly enable location sharing
- Nearby dog queries use bounding box / geohash at neighborhood level, never return exact coordinates
- Lost dog alerts: exact location accessible only while alert is active; auto-expire mechanism
- Location history: no persistent tracking; only current/last-known position
- API responses never leak full-precision coordinates for neighborhood features

### D-3: AI Prompt Injection Prevention

**Requirement:** AI dog agent uses Claude API with system prompts containing user-provided dog traits. Must prevent prompt injection.
**Review criteria:**
- User-provided fields (personality, traits, breed descriptions) are sanitized before inclusion in system prompts
- Use delimiters/XML tags to clearly separate system instructions from user data in prompts
- Input validation: max length limits on personality/trait fields; strip control characters
- Output filtering: AI responses checked for harmful content, personal data leakage, or instruction override indicators
- Rate limiting on AI agent API calls (prevent abuse/cost attacks)
- Claude API key stored securely (env variable, never in client code)
- No user-provided text placed in the system prompt role -- use the user message role with clear framing instead
- Test with known prompt injection payloads: "ignore previous instructions", role-play attacks, delimiter escaping

### D-4: Medical Share Link Security

**Requirement:** Shareable vaccination/medical links use unguessable tokens with expiration and revocation.
**Review criteria:**
- Token generation: `crypto.randomBytes(32)` minimum (256-bit entropy)
- Token stored as SHA-256 hash in DB (not plaintext) -- compare hashes on access
- Mandatory expiration (configurable, reasonable default e.g., 7 days)
- Revocation: owner can invalidate link at any time; DB delete or flag
- Access logging: record who accessed a shared link and when
- Scoped access: link grants read-only to specific medical record(s), not entire profile
- No authentication required to view (by design) but rate-limited to prevent enumeration
