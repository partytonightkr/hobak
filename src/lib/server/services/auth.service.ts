import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { prisma } from '../db';
import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors';
import type { JwtPayload } from '../auth';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: JwtPayload): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as any);
}

function generateRefreshToken(userId: string): { token: string; jti: string; expires: Date } {
  const jti = crypto.randomUUID();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = jwt.sign({ sub: userId, jti }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as any);
  return { token, jti, expires };
}

function decodeRefreshToken(token: string): { sub: string; jti: string } {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; jti: string };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

// Store a new refresh token session in the database. Returns the signed JWT string.
async function createRefreshSession(userId: string): Promise<string> {
  const { token, jti, expires } = generateRefreshToken(userId);
  await prisma.session.create({
    data: {
      sessionToken: jti,
      userId,
      expires,
    },
  });
  return token;
}

// Validate a refresh token: verify the JWT signature, then confirm the jti
// exists in the Session table (not yet revoked / expired).
async function validateAndRevokeRefreshToken(token: string): Promise<string> {
  const { sub: userId, jti } = decodeRefreshToken(token);

  // Atomic delete: if the row exists we get it back; if it was already
  // deleted (replay attack) the deleteMany returns count 0.
  const { count } = await prisma.session.deleteMany({
    where: { sessionToken: jti, userId },
  });

  if (count === 0) {
    // The token's jti is not in the DB. Either it was already rotated
    // (possible replay) or manually revoked. Defensively kill ALL sessions
    // for this user to contain a potential token-theft scenario.
    await prisma.session.deleteMany({ where: { userId } });
    throw new UnauthorizedError('Refresh token reuse detected');
  }

  return userId;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName: string;
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.email }, { username: input.username }],
    },
  });

  if (existing) {
    if (existing.email === input.email) {
      throw new ConflictError('Email already in use');
    }
    throw new ConflictError('Username already taken');
  }

  const passwordHash = await hashPassword(input.password);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        passwordHash,
        displayName: input.displayName,
        profile: { create: {} },
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
    });
  } catch (error: unknown) {
    // Handle unique constraint violation from concurrent registration
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const meta = 'meta' in error ? (error as { meta?: { target?: string[] } }).meta : undefined;
      const target = meta?.target;
      if (target?.includes('email')) {
        throw new ConflictError('Email already in use');
      }
      if (target?.includes('username')) {
        throw new ConflictError('Username already taken');
      }
      throw new ConflictError('Email or username already in use');
    }
    throw error;
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = await createRefreshSession(user.id);

  return { user, accessToken, refreshToken };
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      passwordHash: true,
      role: true,
      deletedAt: true,
    },
  });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.deletedAt) {
    throw new AppError('Account has been deactivated', 403);
  }

  const validPassword = await verifyPassword(input.password, user.passwordHash);
  if (!validPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const { passwordHash: _, deletedAt: __, ...userWithoutSensitive } = user;

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = await createRefreshSession(user.id);

  return { user: userWithoutSensitive, accessToken, refreshToken };
}

export async function refreshTokens(oldRefreshToken: string) {
  // Validate signature + verify jti exists in DB, then atomically delete it (rotation).
  // If the jti was already consumed, all user sessions are killed (theft detection).
  const userId = await validateAndRevokeRefreshToken(oldRefreshToken);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    throw new UnauthorizedError('User not found or deactivated');
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = await createRefreshSession(user.id);

  return { accessToken, refreshToken };
}

export async function logoutUser(refreshToken: string) {
  try {
    const { jti, sub: userId } = decodeRefreshToken(refreshToken);
    await prisma.session.deleteMany({ where: { sessionToken: jti, userId } });
  } catch {
    // Token already invalid / expired -- nothing to revoke
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      isVerified: true,
      isPremium: true,
      role: true,
      followerCount: true,
      followingCount: true,
      createdAt: true,
      profile: {
        select: {
          coverImageUrl: true,
          website: true,
          location: true,
          birthday: true,
        },
      },
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      coverUrl: user.profile?.coverImageUrl ?? null,
      website: user.profile?.website ?? null,
      location: user.profile?.location ?? null,
      isVerified: user.isVerified,
      isPremium: user.isPremium,
      role: user.role,
      followersCount: user.followerCount,
      followingCount: user.followingCount,
      postsCount: user._count.posts,
      createdAt: user.createdAt.toISOString(),
    },
  };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    throw new NotFoundError('User');
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Don't reveal whether the email exists
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Delete any existing reset tokens for this user
  await prisma.verificationToken.deleteMany({
    where: { identifier: `password-reset:${user.id}` },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: `password-reset:${user.id}`,
      token,
      expires,
    },
  });

  // TODO: send password-reset email via email service (SendGrid, SES, etc.)
}

export async function resetPassword(token: string, newPassword: string) {
  const verification = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verification || !verification.identifier.startsWith('password-reset:')) {
    throw new UnauthorizedError('Invalid or expired reset token');
  }

  if (verification.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    throw new UnauthorizedError('Reset token has expired');
  }

  const userId = verification.identifier.replace('password-reset:', '');
  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.verificationToken.delete({ where: { token } }),
    // Invalidate all sessions so user must re-login
    prisma.session.deleteMany({ where: { userId } }),
  ]);
}

export async function requestEmailVerification(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User');
  }
  if (user.emailVerifiedAt) {
    throw new ConflictError('Email already verified');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.verificationToken.deleteMany({
    where: { identifier: `email-verify:${userId}` },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: `email-verify:${userId}`,
      token,
      expires,
    },
  });

  // TODO: send verification email via email service (SendGrid, SES, etc.)
}

export async function verifyEmail(token: string) {
  const verification = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verification || !verification.identifier.startsWith('email-verify:')) {
    throw new UnauthorizedError('Invalid verification token');
  }

  if (verification.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    throw new UnauthorizedError('Verification token has expired');
  }

  const userId = verification.identifier.replace('email-verify:', '');

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);
}

// OAuth: find or create user from an OAuth provider
export async function findOrCreateOAuthUser(data: {
  provider: string;
  providerAccountId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}) {
  // Check if OAuth account already linked
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: data.provider,
        providerAccountId: data.providerAccountId,
      },
    },
    include: {
      user: {
        select: { id: true, email: true, role: true },
      },
    },
  });

  if (existingAccount) {
    const accessToken = generateAccessToken({
      userId: existingAccount.user.id,
      email: existingAccount.user.email,
      role: existingAccount.user.role,
    });
    const refreshToken = await createRefreshSession(existingAccount.user.id);
    return { accessToken, refreshToken, isNewUser: false };
  }

  // Check if user with this email exists - link the OAuth account
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });

  if (existingUser) {
    await prisma.account.create({
      data: {
        userId: existingUser.id,
        type: 'oauth',
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      },
    });

    const accessToken = generateAccessToken({
      userId: existingUser.id,
      email: existingUser.email,
      role: existingUser.role,
    });
    const newRefreshToken = await createRefreshSession(existingUser.id);
    return { accessToken, refreshToken: newRefreshToken, isNewUser: false };
  }

  // Create new user with OAuth account
  const username = `${data.provider}_${data.providerAccountId}`;
  const user = await prisma.user.create({
    data: {
      email: data.email,
      username,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      emailVerifiedAt: new Date(),
      profile: { create: {} },
      accounts: {
        create: {
          type: 'oauth',
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
        },
      },
    },
    select: { id: true, email: true, role: true },
  });

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const newRefreshToken = await createRefreshSession(user.id);
  return { accessToken, refreshToken: newRefreshToken, isNewUser: true };
}
