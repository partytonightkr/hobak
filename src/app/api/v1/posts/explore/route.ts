import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { validateQuery } from '@/lib/server/validation';
import { paginationSchema } from '@/lib/server/utils/pagination';
import * as feedService from '@/lib/server/services/feed.service';

export const GET = apiHandler(async (req: NextRequest) => {
  // Optional auth - no requireAuth() call; explore feed is public
  const pagination = validateQuery(paginationSchema, req.nextUrl.searchParams);
  const result = await feedService.getExploreFeed(pagination);
  return NextResponse.json(result);
});
