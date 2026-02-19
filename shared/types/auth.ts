// Shared authentication types used across frontend and backend

export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  // refreshToken is set as HTTP-only cookie by the server
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface OAuthProvider {
  provider: 'google' | 'github';
  accessToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string; // token ID for rotation tracking
  iat: number;
  exp: number;
}

// API error responses
export interface AuthError {
  code: string;
  message: string;
  field?: string;
}

export interface AuthErrorResponse {
  error: AuthError;
}

// Password validation rules (NIST SP 800-63B)
// No composition rules -- only length + breached-password check
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
} as const;

export const USERNAME_RULES = {
  minLength: 3,
  maxLength: 30,
  pattern: /^[a-zA-Z0-9_-]+$/,
} as const;
