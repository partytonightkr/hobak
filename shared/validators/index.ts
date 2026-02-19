import { z } from 'zod';

// Password & Username Rules (NIST SP 800-63B)
// - Minimum 8 characters, no composition rules (no required uppercase/special chars)
// - Check against a list of commonly breached/weak passwords
// - Maximum length generous (128) to allow passphrases

export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
} as const;

export const USERNAME_RULES = {
  minLength: 3,
  maxLength: 30,
  pattern: /^[a-zA-Z0-9_-]+$/,
} as const;

// Common breached / weak passwords (top entries from public breach corpuses).
// In production, supplement this with an API call to Have I Been Pwned's
// k-anonymity range endpoint for full coverage.
const COMMON_PASSWORDS = new Set([
  'password', '12345678', '123456789', '1234567890', 'qwerty123',
  'password1', 'iloveyou', 'sunshine1', 'princess1', 'football1',
  'charlie1', 'access14', 'trustno1', 'letmein01', 'baseball1',
  'master123', 'dragon123', 'monkey123', 'shadow123', 'michael1',
  'abcdefgh', 'abcd1234', 'abc12345', 'qwerty12', 'password123',
  'welcome1', 'admin123', 'passw0rd', 'changeme', 'p@ssword',
]);

// Reusable Schemas

export const passwordSchema = z
  .string()
  .min(PASSWORD_RULES.minLength, `Password must be at least ${PASSWORD_RULES.minLength} characters`)
  .max(PASSWORD_RULES.maxLength)
  .refine(
    (val) => !COMMON_PASSWORDS.has(val.toLowerCase()),
    'This password is too common and has appeared in data breaches. Please choose a different one.',
  );

export const usernameSchema = z
  .string()
  .min(USERNAME_RULES.minLength, `Username must be at least ${USERNAME_RULES.minLength} characters`)
  .max(USERNAME_RULES.maxLength, `Username must be at most ${USERNAME_RULES.maxLength} characters`)
  .regex(USERNAME_RULES.pattern, 'Username can only contain letters, numbers, underscores, and hyphens');

export const emailSchema = z.string().email('Invalid email address');

// Auth Schemas

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  displayName: z.string().min(1).max(50),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: passwordSchema,
});

// Post Schemas

export const createPostSchema = z.object({
  content: z.string().min(1).max(2000),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS_ONLY']).default('PUBLIC'),
  repostOfId: z.string().optional(),
});

export const updatePostSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS_ONLY']).optional(),
});

// Comment Schemas

export const createCommentSchema = z.object({
  content: z.string().min(1).max(500),
  parentId: z.string().optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(500),
});

// Message Schemas

export const createMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
  recipientId: z.string().optional(),
});

// User Schemas

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  profile: z
    .object({
      website: z.string().url().max(200).optional().nullable(),
      location: z.string().max(100).optional().nullable(),
      coverImageUrl: z.string().url().optional().nullable(),
      birthday: z.string().datetime().optional().nullable(),
    })
    .optional(),
});

// Pagination

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Search Schemas

export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['users', 'posts', 'hashtags', 'all']).default('all'),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Payment Schemas

export const createCheckoutSchema = z.object({
  priceId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});
