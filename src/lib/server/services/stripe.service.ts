import Stripe from 'stripe';
import { prisma } from '../db';
import { env } from '../config/env';
import { AppError, NotFoundError } from '../utils/errors';

function getStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.', 500);
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
  });
}

// Lazy-initialized: only created when a Stripe operation is actually called.
let _stripe: Stripe | null = null;
function stripe(): Stripe {
  if (!_stripe) {
    _stripe = getStripeClient();
  }
  return _stripe;
}

export const PRICE_IDS = {
  premium_monthly: env.STRIPE_PREMIUM_PRICE_ID,
} as const;

export type PriceTier = keyof typeof PRICE_IDS;

export function getTierFromPriceId(priceId: string): 'free' | 'premium' {
  if (priceId === PRICE_IDS.premium_monthly) return 'premium';
  return 'free';
}

export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (existing) {
    return existing.stripeCustomerId;
  }

  const customer = await stripe().customers.create({
    email,
    metadata: { userId },
  });

  await prisma.subscription.create({
    data: {
      userId,
      stripeCustomerId: customer.id,
      status: 'INCOMPLETE',
    },
  });

  return customer.id;
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(userId, email);

  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (sub?.status === 'ACTIVE' && sub.stripeSubscriptionId) {
    throw new AppError('You already have an active subscription. Manage it from your settings.', 400);
  }

  const session = await stripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
  });

  if (!session.url) {
    throw new AppError('Failed to create checkout session', 500);
  }

  return session.url;
}

export async function createBillingPortalSession(userId: string, returnUrl: string): Promise<string> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (!sub) {
    throw new NotFoundError('Subscription');
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function cancelSubscription(userId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!sub || !sub.stripeSubscriptionId) {
    throw new NotFoundError('Subscription');
  }

  if (sub.status !== 'ACTIVE') {
    throw new AppError('No active subscription to cancel', 400);
  }

  await stripe().subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await prisma.subscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: true },
  });
}

export async function resumeSubscription(userId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!sub || !sub.stripeSubscriptionId) {
    throw new NotFoundError('Subscription');
  }

  if (!sub.cancelAtPeriodEnd) {
    throw new AppError('Subscription is not set to cancel', 400);
  }

  await stripe().subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  await prisma.subscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: false },
  });
}

export async function getSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!sub) {
    return { tier: 'free' as const, status: null, subscription: null };
  }

  const tier = sub.stripePriceId ? getTierFromPriceId(sub.stripePriceId) : 'free';

  return {
    tier,
    status: sub.status,
    subscription: {
      id: sub.id,
      stripePriceId: sub.stripePriceId,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      createdAt: sub.createdAt,
    },
  };
}

export async function getInvoices(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (!sub) {
    return [];
  }

  const invoices = await stripe().invoices.list({
    customer: sub.stripeCustomerId,
    limit: 20,
  });

  return invoices.data.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
    periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    invoicePdf: invoice.invoice_pdf,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    createdAt: invoice.created ? new Date(invoice.created * 1000) : null,
  }));
}

export async function handleWebhookEvent(payload: Buffer, signature: string): Promise<void> {
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    throw new AppError('Invalid webhook signature', 400);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.subscription) {
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
        const stripeSub = await stripe().subscriptions.retrieve(subscriptionId);
        const customerId =
          typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;
        const priceId = stripeSub.items.data[0]?.price.id;

        await prisma.subscription.update({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId || null,
            status: 'ACTIVE',
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          },
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
      const priceId = subscription.items.data[0]?.price.id;

      const statusMap: Record<string, string> = {
        active: 'ACTIVE',
        past_due: 'PAST_DUE',
        canceled: 'CANCELED',
        incomplete: 'INCOMPLETE',
        trialing: 'TRIALING',
      };

      await prisma.subscription.update({
        where: { stripeCustomerId: customerId },
        data: {
          stripePriceId: priceId || null,
          status: (statusMap[subscription.status] || 'INCOMPLETE') as any,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

      await prisma.subscription.update({
        where: { stripeCustomerId: customerId },
        data: {
          status: 'CANCELED',
          stripeSubscriptionId: null,
          stripePriceId: null,
          cancelAtPeriodEnd: false,
        },
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        await prisma.subscription.update({
          where: { stripeCustomerId: customerId },
          data: { status: 'PAST_DUE' },
        });
      }
      break;
    }

    default:
      break;
  }
}
