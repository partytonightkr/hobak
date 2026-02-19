import { z } from 'zod';

const COMMON_PASSWORDS = new Set([
  'password', '12345678', '123456789', '1234567890', 'qwerty123',
  'password1', 'iloveyou', 'sunshine1', 'princess1', 'football1',
  'trustno1', 'letmein01', 'baseball1', 'master123', 'dragon123',
  'monkey123', 'shadow123', 'abcdefgh', 'abcd1234', 'abc12345',
  'qwerty12', 'password123', 'welcome1', 'admin123', 'passw0rd',
  'changeme', 'p@ssword',
]);

export const nistPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .refine(
    (val) => !COMMON_PASSWORDS.has(val.toLowerCase()),
    'This password is too common and has appeared in data breaches. Please choose a different one.',
  );

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: nistPasswordSchema,
  displayName: z.string().min(1).max(50),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: nistPasswordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: nistPasswordSchema,
});
