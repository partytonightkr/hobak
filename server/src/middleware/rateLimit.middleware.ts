import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../config/redis';

function maybeRedisStore(prefix: string): RedisStore | undefined {
  const client = getRedisClient();
  if (!client) return undefined;

  return new RedisStore({
    sendCommand: (...args: string[]) => client.sendCommand(args),
    prefix: `rl:${prefix}:`,
  });
}

// Factory function: call AFTER connectRedis() to get Redis-backed limiters.
// Falls back to in-memory if Redis isn't connected.
export function createRateLimiters() {
  return {
    generalLimiter: rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later.' },
      store: maybeRedisStore('general'),
    }),
    authLimiter: rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many authentication attempts, please try again later.' },
      store: maybeRedisStore('auth'),
    }),
    uploadLimiter: rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 50,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Upload limit reached, please try again later.' },
      store: maybeRedisStore('upload'),
    }),
  };
}

// Eagerly-created in-memory instances for route files that import at module level.
// The global rate limiter in index.ts uses createRateLimiters() instead (Redis-backed).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached, please try again later.' },
});
