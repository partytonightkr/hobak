import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import * as stripeService from '@/lib/server/services/stripe.service';

// GET /api/v1/payments/invoices
export const GET = apiHandler(async (_req: NextRequest) => {
  const user = requireAuth();
  const invoices = await stripeService.getInvoices(user.userId);
  return NextResponse.json({ invoices });
});
