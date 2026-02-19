import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';
import { env } from '../config/env';
import * as authService from '../services/auth.service';

const router = Router();

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
}

function getRefreshToken(req: Request): string | undefined {
  // Only read from HTTP-only cookie -- never from request body
  return req.cookies?.[REFRESH_COOKIE_NAME];
}

// --- Validation schemas ---

// NIST SP 800-63B: no composition rules, check against breached passwords
const COMMON_PASSWORDS = new Set([
  'password', '12345678', '123456789', '1234567890', 'qwerty123',
  'password1', 'iloveyou', 'sunshine1', 'princess1', 'football1',
  'trustno1', 'letmein01', 'baseball1', 'master123', 'dragon123',
  'monkey123', 'shadow123', 'abcdefgh', 'abcd1234', 'abc12345',
  'qwerty12', 'password123', 'welcome1', 'admin123', 'passw0rd',
  'changeme', 'p@ssword',
]);

const nistPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .refine(
    (val) => !COMMON_PASSWORDS.has(val.toLowerCase()),
    'This password is too common and has appeared in data breaches. Please choose a different one.',
  );

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: nistPasswordSchema,
  displayName: z.string().min(1).max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: nistPasswordSchema,
});

const verifyEmailSchema = z.object({
  token: z.string(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: nistPasswordSchema,
});

// --- Routes ---

// POST /auth/register
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, accessToken, refreshToken } = await authService.registerUser(req.body);
      setRefreshCookie(res, refreshToken);
      res.status(201).json({ user, accessToken });
    } catch (error) {
      next(error);
    }
  },
);

// POST /auth/login
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, accessToken, refreshToken } = await authService.loginUser(req.body);
      setRefreshCookie(res, refreshToken);
      res.json({ user, accessToken });
    } catch (error) {
      next(error);
    }
  },
);

// POST /auth/refresh
router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const oldToken = getRefreshToken(req);
      if (!oldToken) {
        res.status(401).json({ error: 'No refresh token provided' });
        return;
      }
      const { accessToken, refreshToken } = await authService.refreshTokens(oldToken);
      setRefreshCookie(res, refreshToken);
      res.json({ accessToken });
    } catch (error) {
      clearRefreshCookie(res);
      next(error);
    }
  },
);

// POST /auth/logout
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getRefreshToken(req);
    if (token) {
      await authService.logoutUser(token);
    }
    clearRefreshCookie(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.getMe(req.user!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /auth/forgot-password
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.requestPasswordReset(req.body.email);
      // Always return success to prevent email enumeration
      res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (error) {
      next(error);
    }
  },
);

// POST /auth/reset-password
router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.resetPassword(req.body.token, req.body.password);
      res.json({ message: 'Password has been reset successfully.' });
    } catch (error) {
      next(error);
    }
  },
);

// POST /auth/verify-email
router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.verifyEmail(req.body.token);
      res.json({ message: 'Email verified successfully.' });
    } catch (error) {
      next(error);
    }
  },
);

// POST /auth/request-verification
router.post(
  '/request-verification',
  authenticate,
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.requestEmailVerification(req.user!.userId);
      res.json({ message: 'Verification email sent.' });
    } catch (error) {
      next(error);
    }
  },
);

// POST /auth/change-password
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.changePassword(
        req.user!.userId,
        req.body.currentPassword,
        req.body.newPassword,
      );
      res.json({ message: 'Password changed successfully.' });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
