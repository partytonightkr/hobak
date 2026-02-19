import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import * as stripeService from '@/lib/server/services/stripe.service';

// POST /api/v1/payments/create-portal
export const POST = apiHandler(async (_req: NextRequest) => {
  const user = requireAuth();
  const returnUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/settings/subscription`;
  const url = await stripeService.createBillingPortalSession(user.userId, returnUrl);
  return NextResponse.json({ url });
});
