import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import * as stripeService from '@/lib/server/services/stripe.service';

// POST /api/v1/payments/cancel
export const POST = apiHandler(async (_req: NextRequest) => {
  const user = requireAuth();
  await stripeService.cancelSubscription(user.userId);
  return NextResponse.json({ message: 'Subscription will be canceled at the end of the billing period' });
});
