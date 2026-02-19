import { createClient } from 'redis';
import { env } from './env';

export type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;

export async function connectRedis(): Promise<RedisClient | null> {
  if (client) return client;

  try {
    client = createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: (retries) => {
          if (retries > 3) return new Error('Max retries reached');
          return Math.min(retries * 200, 1000);
        },
      },
    });
    client.on('error', () => {}); // Suppress noisy reconnect errors
    await client.connect();
    console.log('[Redis] Connected');
    return client;
  } catch (err) {
    console.warn('[Redis] Connection failed, falling back to memory:', (err as Error).message);
    client = null;
    return null;
  }
}

export function getRedisClient(): RedisClient | null {
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.disconnect();
    client = null;
  }
}
