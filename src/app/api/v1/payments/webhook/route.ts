import { NextRequest, NextResponse } from 'next/server';
import * as stripeService from '@/lib/server/services/stripe.service';

// POST /api/v1/payments/webhook
// NO apiHandler wrapper, NO auth.
// Stripe requires the raw request body (Buffer) for signature verification.
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    // Read raw body as Buffer for Stripe signature verification
    const rawBody = Buffer.from(await req.arrayBuffer());

    await stripeService.handleWebhookEvent(rawBody, signature);
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
