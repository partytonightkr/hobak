import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/server/redis';

export async function GET() {
  const redis = getRedisClient();
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redis ? 'connected' : 'disconnected',
  });
}
