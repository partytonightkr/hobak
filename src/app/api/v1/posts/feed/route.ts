import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateQuery } from '@/lib/server/validation';
import { paginationSchema } from '@/lib/server/utils/pagination';
import * as feedService from '@/lib/server/services/feed.service';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = requireAuth();
  const pagination = validateQuery(paginationSchema, req.nextUrl.searchParams);
  const result = await feedService.getFeed(user.userId, pagination);
  return NextResponse.json(result);
});
