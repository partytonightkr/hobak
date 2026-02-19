import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { validateBody } from '@/lib/server/validation';
import * as stripeService from '@/lib/server/services/stripe.service';

const allowedPriceIds = [process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_monthly'];

const createCheckoutSchema = z.object({
  priceId: z.string().min(1),
});

// POST /api/v1/payments/create-checkout
export const POST = apiHandler(async (req: NextRequest) => {
  const user = requireAuth();
  const body = await req.json();
  const { priceId } = validateBody(createCheckoutSchema, body);

  if (!allowedPriceIds.includes(priceId)) {
    return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
  }

  const appUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const successUrl = `${appUrl}/settings/subscription?success=true`;
  const cancelUrl = `${appUrl}/pricing?canceled=true`;

  const url = await stripeService.createCheckoutSession(
    user.userId,
    user.email,
    priceId,
    successUrl,
    cancelUrl,
  );

  return NextResponse.json({ url });
});
