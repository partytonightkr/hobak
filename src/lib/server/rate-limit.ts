import { headers } from 'next/headers';
import { getRedisClient } from './redis';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  prefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

// In-memory fallback when Redis is unavailable
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const headerStore = headers();
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `rl:${config.prefix}:${ip}`;

  const redis = getRedisClient();
  if (redis) {
    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.pExpire(key, config.windowMs);
      }
      return {
        allowed: current <= config.max,
        remaining: Math.max(0, config.max - current),
      };
    } catch {
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.expiresAt < now) {
    memoryStore.set(key, { count: 1, expiresAt: now + config.windowMs });
    return { allowed: true, remaining: config.max - 1 };
  }

  entry.count++;
  return {
    allowed: entry.count <= config.max,
    remaining: Math.max(0, config.max - entry.count),
  };
}
